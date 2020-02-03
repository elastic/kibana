/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { omit } from 'lodash';
import uuid from 'uuid';
import { SavedObjectsClientContract } from 'src/core/server';
import {
  MetricThresholdAlertTypeParams,
  Comparator,
  METRIC_THRESHOLD_ALERT_TYPE_ID,
} from './types';
import { infraMetricAlertSavedObjectType } from '../saved_object_mappings';
import { getGroupings } from '../../metrics/get_groupings';
import { ActionsClient } from '../../../../../actions';
import { AlertsClient } from '../../../../../alerting';
import { InfraDatabaseSearchResponse } from '../../../lib/adapters/framework';

interface Properties extends MetricThresholdAlertTypeParams {
  actions: {
    email: string;
    slack: string;
    log: any;
  };
  childOf?: string;
}

interface Clients {
  alertsClient: AlertsClient;
  actionsClient: ActionsClient;
  savedObjectsClient: SavedObjectsClientContract;
}

interface Action {
  actionTypeId: string;
  description: string;
  config: Record<string, any>;
  secrets: Record<string, any>;
}

const comparatorNames = {
  [Comparator.GT]: i18n.translate('xpack.infra.alerting.threshold.greaterThan', {
    defaultMessage: 'greater than',
  }),
  [Comparator.LT]: i18n.translate('xpack.infra.alerting.threshold.lessThan', {
    defaultMessage: 'less than',
  }),
  [Comparator.GT_OR_EQ]: i18n.translate('xpack.infra.alerting.threshold.greaterThanOrEqualTo', {
    defaultMessage: 'greater than or equal to',
  }),
  [Comparator.LT_OR_EQ]: i18n.translate('xpack.infra.alerting.threshold.lessThanOrEqualTo', {
    defaultMessage: 'less than or equal to',
  }),
};

const aggregationNames = {
  avg: i18n.translate('xpack.infra.alerting.threshold.anAverage', {
    defaultMessage: 'an average',
  }),
  max: i18n.translate('xpack.infra.alerting.threshold.aMaximum', {
    defaultMessage: 'a maximum',
  }),
  min: i18n.translate('xpack.infra.alerting.threshold.aMinimum', {
    defaultMessage: 'a minimum',
  }),
  cardinality: i18n.translate('xpack.infra.alerting.threshold.aCardinality', {
    defaultMessage: 'a cardinality',
  }),
  rate: i18n.translate('xpack.infra.alerting.threshold.aRate', {
    defaultMessage: 'a rate',
  }),
  count: i18n.translate('xpack.infra.alerting.threshold.aDocumentCount', {
    defaultMessage: 'a document count',
  }),
};

export const createAlert = async (
  { alertsClient, actionsClient, savedObjectsClient }: Clients,
  {
    actions: { slack, email, log },
    metric,
    comparator,
    aggregation,
    searchField,
    threshold,
    interval,
    indexPattern,
    childOf,
  }: Properties
) => {
  const actions: Array<{ params: Record<string, any>; action: Action; group: string }> = [];

  // TODO Add a check to determine that `interval` is a valid calendar_interval

  const values = {
    metric,
    searchFieldName: searchField.name,
    searchFieldValue: searchField.value,
    threshold,
    interval,
    comparator: comparatorNames[comparator],
    aggregation: aggregationNames[aggregation],
    value: '{{{context.value}}}',
  };

  if (log) {
    const action = {
      actionTypeId: '.server-log',
      description: 'Server log notifications for metric thresholds',
      config: {},
      secrets: {},
    };

    const firedMessage = i18n.translate('xpack.infra.alerting.metricThreshold.log', {
      defaultMessage:
        '{searchFieldValue} has reported {aggregation} {metric} value {comparator} {threshold} within {interval} - {value}',
      values,
    });

    const recoveredMessage = i18n.translate('xpack.infra.alerting.metricThreshold.logRecovered', {
      defaultMessage:
        '[RECOVERED] - {searchFieldValue} no longer reports {aggregation} {metric} value {comparator} {threshold} within {interval} - {value}',
      values,
    });

    actions.push(
      {
        action,
        params: {
          message: firedMessage,
        },
        group: 'fired',
      },
      {
        action,
        params: {
          message: recoveredMessage,
        },
        group: 'recovered',
      }
    );
  }

  if (email) {
    const subject = i18n.translate('xpack.infra.alerting.metricThreshold.emailSubjectText', {
      defaultMessage: '{metric} on {searchFieldValue} has crossed the threshold',
      values,
    });
    const recoveryPrefix = i18n.translate(
      'xpack.infra.alerting.metricThreshold.emailSubjectRecoveryPrefix',
      {
        defaultMessage: '[RECOVERED]',
      }
    );
    const firedBody = i18n.translate(
      'xpack.infra.alerting.metricThreshold.emailTemplateAlertText',
      {
        defaultMessage:
          '{searchFieldName} {searchFieldValue} has reported {aggregation} {metric} value {comparator} {threshold} within {interval}<br/>' +
          '<br/>' +
          'The current value is {value}',
        values,
      }
    );
    const recoveryBody = i18n.translate(
      'xpack.infra.alerting.metricThreshold.emailTemplateRecoveryText',
      {
        defaultMessage:
          '{searchFieldName} {searchFieldValue} has recovered from an alert state in which {aggregation} {metric} value was {comparator} {threshold} within {interval}<br/>' +
          '<br/>' +
          'The current value is {value}',
        values,
      }
    );

    const action = {
      actionTypeId: '.email',
      description: 'Email notifications for metric thresholds',
      config: {
        from: '',
      },
      secrets: {
        user: '',
        password: '',
      },
    };

    const firedParams = {
      to: email,
      subject,
      body: firedBody,
    };

    const recoveredParams = {
      to: email,
      subject: `${recoveryPrefix} ${subject}`,
      body: recoveryBody,
    };

    actions.push(
      {
        action,
        params: firedParams,
        group: 'fired',
      },
      {
        action,
        params: recoveredParams,
        group: 'recovered',
      }
    );
  }

  if (slack) {
    const firedMessage = i18n.translate(
      'xpack.infra.alerting.metricThreshold.slackTemplateAlertText',
      {
        defaultMessage:
          '{searchFieldName} *{searchFieldValue}* has reported {aggregation} `{metric}` value {comparator} `{threshold}` within {interval}.\n\nThe current value is *{value}*',
        values,
      }
    );
    const recoveredMessage = i18n.translate(
      'xpack.infra.alerting.metricThreshold.slackTemplateRecoveryText',
      {
        defaultMessage:
          '{searchFieldName} *{searchFieldValue}* has recovered from an alert state in which {aggregation} `{metric}` value was {comparator} `{threshold}` within {interval}\n\nThe current value is *{value}*',
        values,
      }
    );

    const action = {
      actionTypeId: '.slack',
      description: 'Slack notifications for metric thresholds',
      config: {},
      secrets: {
        webhookUrl: slack,
      },
    };

    actions.push(
      {
        action,
        params: {
          message: firedMessage,
        },
        group: 'fired',
      },
      {
        action,
        params: {
          message: recoveredMessage,
        },
        group: 'recovered',
      }
    );
  }

  if (!actions.length) {
    throw new Error('No actions were defined. Need at least one of email, slack');
  }

  const actionResults = await Promise.all(
    actions.map(({ action, params, group }) =>
      actionsClient
        .create({
          action: {
            actionTypeId: action.actionTypeId,
            description: action.description,
            config: action.config,
            secrets: action.secrets,
          },
        })
        .then(result => ({
          result,
          params,
          group,
        }))
    )
  );

  const createdAlert = await alertsClient.create({
    data: {
      alertTypeId: METRIC_THRESHOLD_ALERT_TYPE_ID,
      alertTypeParams: {
        searchField,
        threshold,
        interval,
        comparator,
        aggregation,
        metric,
        indexPattern,
      },
      interval,
      enabled: true,
      actions: actionResults.map(({ result, params, group }) => {
        return {
          group,
          id: result.id,
          params,
        };
      }),
      throttle: null,
    },
  });

  if (!createdAlert.id) throw new Error('Alert not successfully created');

  await savedObjectsClient.create(
    infraMetricAlertSavedObjectType,
    {
      searchField,
      threshold,
      interval,
      comparator,
      aggregation,
      metric,
      indexPattern,
      ...(childOf ? { childOf } : {}),
    },
    { id: createdAlert.id }
  );

  return createdAlert.id;
};

export const createMultiAlert = async (
  search: <Aggregation>(options: object) => Promise<InfraDatabaseSearchResponse<{}, Aggregation>>,
  clients: Clients,
  props: Properties
) => {
  const { savedObjectsClient } = clients;
  const { metric, aggregation, searchField, interval, indexPattern } = props;
  const options = {
    metrics: [
      {
        aggregation,
        field: metric,
        rate: false,
      },
    ],
    groupBy: searchField.name,
    indexPattern,
    timerange: {
      from: `now-${interval}`,
      to: 'now',
      field: '@timestamp',
      interval,
    },
  };

  const multiAlertId = uuid.v4();

  const groupings = await getGroupings(search, options);
  if (!groupings.series) throw new Error('Unable to get groupings');
  const results = await Promise.all(
    groupings.series.map(({ id }: { id: string }) =>
      createAlert(clients, {
        ...props,
        searchField: {
          ...searchField,
          value: id,
        },
        childOf: multiAlertId,
      })
    )
  );

  await savedObjectsClient.create(
    infraMetricAlertSavedObjectType,
    { ...omit(props, 'actions'), childAlerts: results },
    { id: multiAlertId }
  );
  return { id: multiAlertId, children: results };
};
