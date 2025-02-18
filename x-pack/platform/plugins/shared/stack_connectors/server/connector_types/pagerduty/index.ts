/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isUndefined, pick, omitBy } from 'lodash';
import { i18n } from '@kbn/i18n';
import { schema, TypeOf } from '@kbn/config-schema';
import moment from 'moment';
import type {
  ActionType as ConnectorType,
  ActionTypeExecutorOptions as ConnectorTypeExecutorOptions,
  ActionTypeExecutorResult as ConnectorTypeExecutorResult,
  ValidatorServices,
} from '@kbn/actions-plugin/server/types';
import {
  AlertingConnectorFeatureId,
  UptimeConnectorFeatureId,
  SecurityConnectorFeatureId,
} from '@kbn/actions-plugin/common';
import { postPagerduty } from './post_pagerduty';
import { convertTimestamp } from '../lib/convert_timestamp';

// uses the PagerDuty Events API v2
// https://v2.developer.pagerduty.com/docs/events-api-v2
const PAGER_DUTY_API_URL = 'https://events.pagerduty.com/v2/enqueue';

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

// config definition

export type ConnectorTypeConfigType = TypeOf<typeof ConfigSchema>;

const configSchemaProps = {
  apiUrl: schema.nullable(schema.string()),
};
const ConfigSchema = schema.object(configSchemaProps);
// secrets definition

export type ConnectorTypeSecretsType = TypeOf<typeof SecretsSchema>;

const SecretsSchema = schema.object({
  routingKey: schema.string(),
});

// params definition

export type ActionParamsType = TypeOf<typeof ParamsSchema>;

const EVENT_ACTION_TRIGGER = 'trigger';
const EVENT_ACTION_RESOLVE = 'resolve';
const EVENT_ACTION_ACKNOWLEDGE = 'acknowledge';
const EVENT_ACTIONS_WITH_REQUIRED_DEDUPKEY = new Set([
  EVENT_ACTION_RESOLVE,
  EVENT_ACTION_ACKNOWLEDGE,
]);

const EventActionSchema = schema.oneOf([
  schema.literal(EVENT_ACTION_TRIGGER),
  schema.literal(EVENT_ACTION_RESOLVE),
  schema.literal(EVENT_ACTION_ACKNOWLEDGE),
]);

const PayloadSeveritySchema = schema.oneOf([
  schema.literal('critical'),
  schema.literal('error'),
  schema.literal('warning'),
  schema.literal('info'),
]);

const LinksSchema = schema.arrayOf(schema.object({ href: schema.string(), text: schema.string() }));
const customDetailsSchema = schema.recordOf(schema.string(), schema.any());

export const ParamsSchema = schema.object(
  {
    eventAction: schema.maybe(EventActionSchema),
    dedupKey: schema.maybe(schema.string({ maxLength: 255 })),
    summary: schema.maybe(schema.string({ maxLength: 1024 })),
    source: schema.maybe(schema.string()),
    severity: schema.maybe(PayloadSeveritySchema),
    timestamp: schema.maybe(schema.string()),
    component: schema.maybe(schema.string()),
    group: schema.maybe(schema.string()),
    class: schema.maybe(schema.string()),
    links: schema.maybe(LinksSchema),
    customDetails: schema.maybe(customDetailsSchema),
  },
  { validate: validateParams }
);

function validateParams(paramsObject: unknown): string | void {
  const { timestamp, eventAction, dedupKey } = paramsObject as ActionParamsType;
  const convertedTimestamp = convertTimestamp(timestamp);
  if (convertedTimestamp != null) {
    try {
      const date = moment(convertedTimestamp);
      if (!date.isValid()) {
        return i18n.translate('xpack.stackConnectors.pagerduty.invalidTimestampErrorMessage', {
          defaultMessage: `error parsing timestamp "{timestamp}"`,
          values: {
            timestamp,
          },
        });
      }
    } catch (err) {
      return i18n.translate('xpack.stackConnectors.pagerduty.timestampParsingFailedErrorMessage', {
        defaultMessage: `error parsing timestamp "{timestamp}": {message}`,
        values: {
          timestamp,
          message: err.message,
        },
      });
    }
  }
  if (eventAction && EVENT_ACTIONS_WITH_REQUIRED_DEDUPKEY.has(eventAction) && !dedupKey) {
    return i18n.translate('xpack.stackConnectors.pagerduty.missingDedupkeyErrorMessage', {
      defaultMessage: `DedupKey is required when eventAction is "{eventAction}"`,
      values: {
        eventAction,
      },
    });
  }
}

export const ConnectorTypeId = '.pagerduty';
// connector type definition
export function getConnectorType(): PagerDutyConnectorType {
  return {
    id: ConnectorTypeId,
    minimumLicenseRequired: 'gold',
    name: i18n.translate('xpack.stackConnectors.pagerduty.title', {
      defaultMessage: 'PagerDuty',
    }),
    supportedFeatureIds: [
      AlertingConnectorFeatureId,
      UptimeConnectorFeatureId,
      SecurityConnectorFeatureId,
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
