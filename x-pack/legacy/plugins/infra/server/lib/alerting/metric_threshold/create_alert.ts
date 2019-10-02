/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { METRIC_THRESHOLD_ALERT_TYPE_ID, Comparator } from './constants';
import { MetricsExplorerAggregation } from '../../../routes/metrics_explorer/types';
import { ActionsClient } from '../../../../../actions';
import { AlertsClient } from '../../../../../alerting';

interface Properties {
  hostName: string;
  metric: string;
  comparator: Comparator;
  aggregation: MetricsExplorerAggregation;
  threshold: number;
  interval: string;
  actions: {
    email: string;
    slack: string;
    log: string;
  };
}

interface Clients {
  alertsClient: AlertsClient;
  actionsClient: ActionsClient;
}

interface Action {
  actionTypeId: string;
  description: string;
  config: Record<string, any>;
  secrets: Record<string, any>;
}

const comparatorNames = {
  GT: i18n.translate('xpack.infra.alerting.threshold.greaterThan', {
    defaultMessage: 'greater than',
  }),
  LT: i18n.translate('xpack.infra.alerting.threshold.lessThan', {
    defaultMessage: 'less than',
  }),
  GT_OR_EQ: i18n.translate('xpack.infra.alerting.threshold.greaterThanOrEqualTo', {
    defaultMessage: 'greater than or equal to',
  }),
  LT_OR_EQ: i18n.translate('xpack.infra.alerting.threshold.lessThanOrEqualTo', {
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

const createAlert = async (
  { alertsClient, actionsClient }: Clients,
  {
    actions: { slack, email, log },
    metric,
    comparator,
    aggregation,
    hostName,
    threshold,
    interval,
  }: Properties
) => {
  const actions: Array<{ params: Record<string, any>; action: Action }> = [];

  // TODO Create a different action group for recovery alerts
  const isRecovery = false;

  // TODO Add a check to determine that `interval` is a valid calendar_interval

  const values = {
    metric,
    hostName,
    threshold,
    interval,
    comparator: comparatorNames[comparator],
    aggregation: aggregationNames[aggregation],
    value: '{{{context.value}}}',
  };

  if (log) {
    actions.push({
      action: {
        actionTypeId: '.server-log',
        description: 'Server log notifications for metric thresholds',
        config: {},
        secrets: {},
      },
      params: {
        message: i18n.translate('xpack.infra.alerting.metricThreshold.log', {
          defaultMessage:
            '{hostName} has reported {aggregation} {metric} value {comparator} {threshold} within {interval} - {value}',
          values,
        }),
      },
    });
  }

  if (email) {
    const subject = i18n.translate('xpack.infra.alerting.metricThreshold.emailSubjectText', {
      defaultMessage: '{metric} on {hostName} has crossed the threshold',
      values: { hostName, metric },
    });
    const recoveryPrefix = i18n.translate(
      'xpack.infra.alerting.metricThreshold.emailSubjectRecoveryPrefix',
      {
        defaultMessage: '[RECOVERED]',
      }
    );
    const alertBody = i18n.translate(
      'xpack.infra.alerting.metricThreshold.emailTemplateAlertText',
      {
        defaultMessage:
          'Your host {hostName} has reported {aggregation} {metric} value {comparator} {threshold} within {interval}<br/>' +
          '<br/>' +
          'The current value is {value}',
        values,
      }
    );
    const recoveryBody = i18n.translate(
      'xpack.infra.alerting.metricThreshold.emailTemplateRecoveryText',
      {
        defaultMessage:
          'Your host {hostName} has recovered from an alert state in which {aggregation} {metric} value was {comparator} {threshold} within {interval}<br/>' +
          '<br/>' +
          'The current value is {value}',
        values,
      }
    );

    actions.push({
      action: {
        actionTypeId: '.email',
        description: 'Email notifications for metric thresholds',
        config: {
          from: '',
        },
        secrets: {
          user: '',
          password: '',
        },
      },
      params: {
        to: email,
        subject: isRecovery ? `${recoveryPrefix} ${subject}` : subject,
        body: isRecovery ? recoveryBody : alertBody,
      },
    });
  }

  if (slack) {
    const alertMessage = i18n.translate(
      'xpack.infra.alerting.metricThreshold.slackTemplateAlertText',
      {
        defaultMessage:
          'Your host *{hostName}* has reported {aggregation} `{metric}` value {comparator} {threshold} within {interval}.\n\nThe current value is *{value}*',
        values,
      }
    );
    const recoveryMessage = i18n.translate(
      'xpack.infra.alerting.metricThreshold.slackTemplateRecoveryText',
      {
        defaultMessage:
          'Your host *{hostName}* has recovered from an alert state in which {aggregation} `{metric}` value was {comparator} {threshold} within {interval}\n\nThe current value is *{value}*',
        values,
      }
    );
    actions.push({
      action: {
        actionTypeId: '.slack',
        description: 'Slack notifications for metric thresholds',
        config: {},
        secrets: {
          webhookUrl: slack,
        },
      },
      params: {
        message: isRecovery ? recoveryMessage : alertMessage,
      },
    });
  }

  if (!actions.length) {
    throw new Error('No actions were defined. Need at least one of email, slack');
  }

  const actionResults = await Promise.all(
    actions.map(({ action, params }) =>
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
        }))
    )
  );

  return alertsClient.create({
    data: {
      alertTypeId: METRIC_THRESHOLD_ALERT_TYPE_ID,
      alertTypeParams: {
        hostName,
        threshold,
        interval,
        comparator,
        aggregation,
        metric,
      },
      interval,
      enabled: true,
      actions: actionResults.map(({ result, params }) => {
        return {
          group: 'default',
          id: result.id,
          params,
        };
      }),
      throttle: null,
    },
  });
};

export { createAlert };
