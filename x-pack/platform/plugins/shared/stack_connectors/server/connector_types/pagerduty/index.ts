/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isUndefined, pick, omitBy } from 'lodash';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import type {
  ClassicActionType as ConnectorType,
  ActionTypeExecutorOptions as ConnectorTypeExecutorOptions,
  ActionTypeExecutorResult as ConnectorTypeExecutorResult,
  ValidatorServices,
} from '@kbn/actions-plugin/server/types';
import {
  AlertingConnectorFeatureId,
  UptimeConnectorFeatureId,
  SecurityConnectorFeatureId,
  WorkflowsConnectorFeatureId,
} from '@kbn/actions-plugin/common';
import { getErrorSource } from '@kbn/task-manager-plugin/server/task_running';
import {
  CONNECTOR_ID,
  CONNECTOR_NAME,
  PAGER_DUTY_API_URL,
  EVENT_ACTION_TRIGGER,
  EVENT_ACTION_ACKNOWLEDGE,
  EVENT_ACTION_RESOLVE,
  ConfigSchema,
  SecretsSchema,
  ParamsSchema,
} from '@kbn/connector-schemas/pagerduty';
import type {
  ConnectorTypeConfigType,
  ConnectorTypeSecretsType,
  ActionParamsType,
} from '@kbn/connector-schemas/pagerduty';
import { convertTimestamp } from '@kbn/connector-schemas/common/utils';
import { postPagerduty } from './post_pagerduty';

export type PagerDutyConnectorType = ConnectorType<
  ConnectorTypeConfigType,
  ConnectorTypeSecretsType,
  ActionParamsType,
  unknown
>;

export type PagerDutyConnectorTypeExecutorOptions = ConnectorTypeExecutorOptions<
  ConnectorTypeConfigType,
  ConnectorTypeSecretsType,
  ActionParamsType
>;

// connector type definition
export function getConnectorType(): PagerDutyConnectorType {
  return {
    id: CONNECTOR_ID,
    minimumLicenseRequired: 'gold',
    name: CONNECTOR_NAME,
    supportedFeatureIds: [
      AlertingConnectorFeatureId,
      UptimeConnectorFeatureId,
      SecurityConnectorFeatureId,
      WorkflowsConnectorFeatureId,
    ],
    validate: {
      config: {
        schema: ConfigSchema,
        customValidator: validateConnectorTypeConfig,
      },
      secrets: {
        schema: SecretsSchema,
      },
      params: {
        schema: ParamsSchema,
      },
    },
    executor,
  };
}

function validateConnectorTypeConfig(
  configObject: ConnectorTypeConfigType,
  validatorServices: ValidatorServices
) {
  const { configurationUtilities } = validatorServices;
  try {
    configurationUtilities.ensureUriAllowed(getPagerDutyApiUrl(configObject));
  } catch (allowListError) {
    throw new Error(
      i18n.translate('xpack.stackConnectors.pagerduty.configurationError', {
        defaultMessage: 'error configuring pagerduty action: {message}',
        values: {
          message: allowListError.message,
        },
      })
    );
  }
}

function getPagerDutyApiUrl(config: ConnectorTypeConfigType): string {
  return config.apiUrl || PAGER_DUTY_API_URL;
}

// action executor

async function executor(
  execOptions: PagerDutyConnectorTypeExecutorOptions
): Promise<ConnectorTypeExecutorResult<unknown>> {
  const {
    actionId,
    config,
    secrets,
    params,
    services,
    configurationUtilities,
    logger,
    connectorUsageCollector,
  } = execOptions;

  const apiUrl = getPagerDutyApiUrl(config);
  const headers = {
    'Content-Type': 'application/json',
    'X-Routing-Key': secrets.routingKey,
  };
  const data = getBodyForEventAction(actionId, params);

  let response;
  try {
    response = await postPagerduty(
      { apiUrl, data, headers, services },
      logger,
      configurationUtilities,
      connectorUsageCollector
    );
  } catch (err) {
    const message = i18n.translate('xpack.stackConnectors.pagerduty.postingErrorMessage', {
      defaultMessage: 'error posting pagerduty event',
    });
    logger.warn(`error thrown posting pagerduty event: ${err.message}`);
    return {
      status: 'error',
      actionId,
      message,
      serviceMessage: err.message,
      errorSource: getErrorSource(err),
    };
  }

  if (response == null) {
    const message = i18n.translate(
      'xpack.stackConnectors.pagerduty.unexpectedNullResponseErrorMessage',
      {
        defaultMessage: 'unexpected null response from pagerduty',
      }
    );
    return {
      status: 'error',
      actionId,
      message,
    };
  }

  logger.debug(`response posting pagerduty event: ${response.status}`);

  if (response.status === 202) {
    return {
      status: 'ok',
      actionId,
      data: response.data,
    };
  }

  if (response.status === 429 || response.status >= 500) {
    const message = i18n.translate('xpack.stackConnectors.pagerduty.postingRetryErrorMessage', {
      defaultMessage: 'error posting pagerduty event: http status {status}, retry later',
      values: {
        status: response.status,
      },
    });

    return {
      status: 'error',
      actionId,
      message,
      retry: true,
    };
  }

  const message = i18n.translate('xpack.stackConnectors.pagerduty.postingUnexpectedErrorMessage', {
    defaultMessage: 'error posting pagerduty event: unexpected status {status}',
    values: {
      status: response.status,
    },
  });

  return {
    status: 'error',
    actionId,
    message,
  };
}

// utilities

const AcknowledgeOrResolve = new Set([EVENT_ACTION_ACKNOWLEDGE, EVENT_ACTION_RESOLVE]);

interface PagerDutyPayload {
  event_action: ActionParamsType['eventAction'];
  dedup_key?: string;
  payload?: {
    summary: string;
    source: string;
    severity: string;
    timestamp?: string;
    component?: string;
    group?: string;
    class?: string;
    custom_details?: Record<string, unknown>;
  };
  links?: Array<{ href: string; text: string }>;
}

function getBodyForEventAction(actionId: string, params: ActionParamsType): PagerDutyPayload {
  const eventAction = params.eventAction ?? EVENT_ACTION_TRIGGER;

  const data: PagerDutyPayload = {
    event_action: eventAction,
  };

  if (params.dedupKey) {
    data.dedup_key = params.dedupKey;
  }

  // for acknowledge / resolve, just send the dedup key
  if (AcknowledgeOrResolve.has(eventAction)) {
    return data;
  }

  const convertedTimestamp = convertTimestamp(params.timestamp);

  data.payload = {
    summary: params.summary || 'No summary provided.',
    source: params.source || `Kibana Action ${actionId}`,
    severity: params.severity || 'info',
    ...(convertedTimestamp ? { timestamp: moment(convertedTimestamp).toISOString() } : {}),
    ...omitBy(pick(params, ['component', 'group', 'class']), isUndefined),
    ...(params.customDetails ? { custom_details: params.customDetails } : {}),
  };

  if (params.links) {
    data.links = params.links;
  }

  return data;
}
