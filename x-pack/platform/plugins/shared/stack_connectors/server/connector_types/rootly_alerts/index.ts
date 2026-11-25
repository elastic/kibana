/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import axios from 'axios';
import { i18n } from '@kbn/i18n';
import type { Logger } from '@kbn/core/server';
import type {
  ClassicActionType as ConnectorType,
  ActionTypeExecutorOptions as ConnectorTypeExecutorOptions,
  ActionTypeExecutorResult as ConnectorTypeExecutorResult,
  ValidatorServices,
} from '@kbn/actions-plugin/server/types';
import { AlertingConnectorFeatureId, SecurityConnectorFeatureId } from '@kbn/actions-plugin/common';
import { request } from '@kbn/actions-plugin/server/lib/axios_utils';
import {
  renderMustacheObject,
  renderMustacheString,
} from '@kbn/actions-plugin/server/lib/mustache_renderer';
import { getErrorSource } from '@kbn/task-manager-plugin/server/task_running';
import {
  CONNECTOR_ID,
  CONNECTOR_NAME,
  ConfigSchema,
  SecretsSchema,
  ParamsSchema,
} from '@kbn/connector-schemas/rootly_alerts';
import type {
  ConnectorTypeConfigType,
  ConnectorTypeSecretsType,
  ActionParamsType,
} from '@kbn/connector-schemas/rootly_alerts';
import { getDedupKey, getEventBody } from '../../../common/rootly_alerts/event_body';

export interface RootlyAlertsExecutorResultData {
  dedupKey: string;
}

export type RootlyAlertsConnectorType = ConnectorType<
  ConnectorTypeConfigType,
  ConnectorTypeSecretsType,
  ActionParamsType,
  RootlyAlertsExecutorResultData
>;

export type RootlyAlertsConnectorTypeExecutorOptions = ConnectorTypeExecutorOptions<
  ConnectorTypeConfigType,
  ConnectorTypeSecretsType,
  ActionParamsType
>;

export function getConnectorType(): RootlyAlertsConnectorType {
  return {
    id: CONNECTOR_ID,
    minimumLicenseRequired: 'gold',
    name: CONNECTOR_NAME,
    supportedFeatureIds: [AlertingConnectorFeatureId, SecurityConnectorFeatureId],
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
    renderParameterTemplates,
    executor,
  };
}

// Custom details are a JSON string, so values rendered into them have to be escaped.
function renderParameterTemplates(
  logger: Logger,
  params: ActionParamsType,
  variables: Record<string, unknown>
): ActionParamsType {
  const { customDetails, ...rest } = params;
  return {
    ...renderMustacheObject(logger, rest, variables),
    ...(customDetails
      ? { customDetails: renderMustacheString(logger, customDetails, variables, 'json') }
      : {}),
  };
}

function validateConnectorTypeConfig(
  configObject: ConnectorTypeConfigType,
  validatorServices: ValidatorServices
) {
  const { configurationUtilities } = validatorServices;

  let url: URL;
  try {
    url = new URL(configObject.webhookUrl);
  } catch (err) {
    throw new Error(
      i18n.translate('xpack.stackConnectors.rootlyAlerts.configurationErrorNoHostname', {
        defaultMessage:
          'error configuring rootly alerts action: unable to parse host name from webhookUrl',
      })
    );
  }

  // The config is stored and returned in plain text, so the secret has to stay out of it.
  if (url.searchParams.has('secret')) {
    throw new Error(
      i18n.translate('xpack.stackConnectors.rootlyAlerts.configurationErrorSecretInUrl', {
        defaultMessage:
          'error configuring rootly alerts action: webhookUrl must not include the secret',
      })
    );
  }

  try {
    configurationUtilities.ensureUriAllowed(configObject.webhookUrl);
  } catch (allowListError) {
    throw new Error(
      i18n.translate('xpack.stackConnectors.rootlyAlerts.configurationError', {
        defaultMessage: 'error configuring rootly alerts action: {message}',
        values: {
          message: allowListError.message,
        },
      })
    );
  }
}

const HTTP_DATE = /^[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/;

// Retry-After as seconds or an HTTP date. Anything else is retried on the default schedule.
export function getRetryAfter(headers: Record<string, unknown>): Date | true {
  const retryAfter = String(headers['retry-after'] ?? '').trim();
  let time = NaN;
  if (/^\d+$/.test(retryAfter)) {
    time = Date.now() + Number(retryAfter) * 1000;
  } else if (HTTP_DATE.test(retryAfter)) {
    time = Date.parse(retryAfter);
  }
  const date = new Date(time);
  return Number.isNaN(date.getTime()) ? true : date;
}

// Error text from Rootly and from the request is logged and shown to users.
export function redactSecret(text: string | undefined, secret: string): string | undefined {
  return text?.split(secret).join('[REDACTED]');
}

export function getServiceMessage(data: unknown): string | undefined {
  if (data == null || typeof data !== 'object') {
    return undefined;
  }
  const { error, errors } = data as { error?: unknown; errors?: unknown };
  if (typeof error === 'string' && error) {
    return error;
  }
  const title = Array.isArray(errors) ? (errors[0] as { title?: unknown })?.title : undefined;
  return typeof title === 'string' && title ? title : undefined;
}

async function executor(
  execOptions: RootlyAlertsConnectorTypeExecutorOptions
): Promise<ConnectorTypeExecutorResult<RootlyAlertsExecutorResultData>> {
  const {
    actionId,
    config,
    secrets,
    params,
    configurationUtilities,
    logger,
    connectorUsageCollector,
  } = execOptions;

  // A trigger with no dedup key and no rule, for example from the connector test form, gets a new one.
  const dedupKey = getDedupKey(params) ?? randomUUID();

  let response;
  try {
    response = await request({
      axios: axios.create(),
      url: config.webhookUrl,
      method: 'post',
      logger,
      data: getEventBody({ ...params, dedupKey }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secrets.secret}`,
      },
      configurationUtilities,
      validateStatus: () => true,
      connectorUsageCollector,
    });
  } catch (err) {
    const message = i18n.translate('xpack.stackConnectors.rootlyAlerts.postingErrorMessage', {
      defaultMessage: 'error posting rootly alerts event',
    });
    const serviceMessage = redactSecret(err.message, secrets.secret);
    logger.warn(`error thrown posting rootly alerts event: ${serviceMessage}`);
    return {
      status: 'error',
      actionId,
      message,
      serviceMessage,
      errorSource: getErrorSource(err),
    };
  }

  logger.debug(`response posting rootly alerts event: ${response.status}`);

  if (response.status >= 200 && response.status < 300) {
    return {
      status: 'ok',
      actionId,
      data: { dedupKey },
    };
  }

  const serviceMessage = redactSecret(getServiceMessage(response.data), secrets.secret);

  if (response.status === 429 || response.status >= 500) {
    const message = i18n.translate('xpack.stackConnectors.rootlyAlerts.postingRetryErrorMessage', {
      defaultMessage: 'error posting rootly alerts event: http status {status}, retry later',
      values: {
        status: response.status,
      },
    });

    return {
      status: 'error',
      actionId,
      message,
      serviceMessage,
      retry: getRetryAfter(response.headers),
    };
  }

  const message = i18n.translate(
    'xpack.stackConnectors.rootlyAlerts.postingUnexpectedErrorMessage',
    {
      defaultMessage: 'error posting rootly alerts event: unexpected status {status}',
      values: {
        status: response.status,
      },
    }
  );

  return {
    status: 'error',
    actionId,
    message,
    serviceMessage,
  };
}
