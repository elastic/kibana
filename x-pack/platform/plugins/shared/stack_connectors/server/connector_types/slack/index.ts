/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { URL } from 'url';
import HttpProxyAgent from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { i18n } from '@kbn/i18n';
import { Logger } from '@kbn/core/server';
import { schema, TypeOf } from '@kbn/config-schema';
import { IncomingWebhook, IncomingWebhookResult } from '@slack/webhook';
import { pipe } from 'fp-ts/lib/pipeable';
import { map, getOrElse } from 'fp-ts/lib/Option';
import type {
  ActionType as ConnectorType,
  ActionTypeExecutorOptions as ConnectorTypeExecutorOptions,
  ActionTypeExecutorResult as ConnectorTypeExecutorResult,
  ExecutorType,
  ValidatorServices,
} from '@kbn/actions-plugin/server/types';
import {
  AlertingConnectorFeatureId,
  UptimeConnectorFeatureId,
  SecurityConnectorFeatureId,
} from '@kbn/actions-plugin/common';
import { renderMustacheString } from '@kbn/actions-plugin/server/lib/mustache_renderer';
import { getCustomAgents } from '@kbn/actions-plugin/server/lib/get_custom_agents';
import { TaskErrorSource } from '@kbn/task-manager-plugin/common';
import { getRetryAfterIntervalFromHeaders } from '../lib/http_response_retry_header';

export type SlackConnectorType = ConnectorType<
  {},
  ConnectorTypeSecretsType,
  ActionParamsType,
  unknown
>;
export type SlackConnectorTypeExecutorOptions = ConnectorTypeExecutorOptions<
  {},
  ConnectorTypeSecretsType,
  ActionParamsType
>;

// secrets definition

export type ConnectorTypeSecretsType = TypeOf<typeof SecretsSchema>;

const secretsSchemaProps = {
  webhookUrl: schema.string(),
};
const SecretsSchema = schema.object(secretsSchemaProps);

// params definition

export type ActionParamsType = TypeOf<typeof ParamsSchema>;

export const ParamsSchema = schema.object({
  message: schema.string({ minLength: 1 }),
});

// connector type definition

export const ConnectorTypeId = '.slack';
// customizing executor is only used for tests
export function getConnectorType({
  executor = slackExecutor,
}: {
  executor?: ExecutorType<{}, ConnectorTypeSecretsType, ActionParamsType, unknown>;
}): SlackConnectorType {
  return {
    id: ConnectorTypeId,
    minimumLicenseRequired: 'gold',
    name: i18n.translate('xpack.stackConnectors.slack.title', {
      defaultMessage: 'Slack',
    }),
    supportedFeatureIds: [
      AlertingConnectorFeatureId,
      UptimeConnectorFeatureId,
      SecurityConnectorFeatureId,
    ],
    validate: {
      config: { schema: schema.object({}, { defaultValue: {} }) },
      secrets: {
        schema: SecretsSchema,
        customValidator: validateConnectorTypeConfig,
      },
      params: {
        schema: ParamsSchema,
      },
    },
    renderParameterTemplates,
    executor,
  };
}

function renderParameterTemplates(
  logger: Logger,
  params: ActionParamsType,
  variables: Record<string, unknown>
): ActionParamsType {
  return {
    message: renderMustacheString(logger, params.message, variables, 'slack'),
  };
}

function validateConnectorTypeConfig(
  secretsObject: ConnectorTypeSecretsType,
  validatorServices: ValidatorServices
) {
  const { configurationUtilities } = validatorServices;
  const configuredUrl = secretsObject.webhookUrl;
  try {
    new URL(configuredUrl);
  } catch (err) {
    throw new Error(
      i18n.translate('xpack.stackConnectors.slack.configurationErrorNoHostname', {
        defaultMessage: 'error configuring slack action: unable to parse host name from webhookUrl',
      })
    );
  }

  try {
    configurationUtilities.ensureUriAllowed(configuredUrl);
  } catch (allowListError) {
    throw new Error(
      i18n.translate('xpack.stackConnectors.slack.configurationError', {
        defaultMessage: 'error configuring slack action: {message}',
        values: {
          message: allowListError.message,
        },
      })
    );
  }
}

// action executor

async function slackExecutor(
  execOptions: SlackConnectorTypeExecutorOptions
): Promise<ConnectorTypeExecutorResult<unknown>> {
  const { actionId, secrets, params, configurationUtilities, logger, connectorUsageCollector } =
    execOptions;

  let result: IncomingWebhookResult;
  const { webhookUrl } = secrets;
  const { message } = params;
  const proxySettings = configurationUtilities.getProxySettings();

  const customAgents = getCustomAgents(configurationUtilities, logger, webhookUrl);
  const agent = webhookUrl.toLowerCase().startsWith('https')
    ? customAgents.httpsAgent
    : customAgents.httpAgent;

  if (proxySettings) {
    if (agent instanceof HttpProxyAgent || agent instanceof HttpsProxyAgent) {
      logger.debug(`IncomingWebhook was called with proxyUrl ${proxySettings.proxyUrl}`);
    }
  }

  try {
    // https://slack.dev/node-slack-sdk/webhook
    // node-slack-sdk use Axios inside :)
    const webhook = new IncomingWebhook(webhookUrl, {
      agent,
    });
    connectorUsageCollector.addRequestBodyBytes(undefined, { text: message });
    result = await webhook.send(message);
  } catch (err) {
    if (err.original == null || err.original.response == null) {
      return serviceErrorResult(actionId, err.message);
    }

    const { status, statusText, headers } = err.original.response;

    // special handling for 5xx
    if (status >= 500) {
      return retryResult(actionId, err.message, TaskErrorSource.FRAMEWORK);
    }

    // special handling for rate limiting
    if (status === 429) {
      return pipe(
        getRetryAfterIntervalFromHeaders(headers),
        map((retry) => retryResultSeconds(actionId, err.message, retry)),
        getOrElse(() => retryResult(actionId, err.message, TaskErrorSource.USER))
      );
    }

    const errMessage = i18n.translate(
      'xpack.stackConnectors.slack.unexpectedHttpResponseErrorMessage',
      {
        defaultMessage: 'unexpected http response from slack: {httpStatus} {httpStatusText}',
        values: {
          httpStatus: status,
          httpStatusText: statusText,
        },
      }
    );
    logger.error(`error on ${actionId} slack action: ${errMessage}`);

    return errorResult(actionId, errMessage);
  }

  if (result == null) {
    const errMessage = i18n.translate(
      'xpack.stackConnectors.slack.unexpectedNullResponseErrorMessage',
      {
        defaultMessage: 'unexpected null response from slack',
      }
    );
    return errorResult(actionId, errMessage);
  }

  if (result.text !== 'ok') {
    return serviceErrorResult(actionId, result.text);
  }

  return successResult(actionId, result);
}

function successResult(actionId: string, data: unknown): ConnectorTypeExecutorResult<unknown> {
  return { status: 'ok', data, actionId };
}

function errorResult(actionId: string, message: string): ConnectorTypeExecutorResult<void> {
  return {
    status: 'error',
    message,
    actionId,
  };
}
function serviceErrorResult(
  actionId: string,
  serviceMessage: string
): ConnectorTypeExecutorResult<void> {
  const errMessage = i18n.translate('xpack.stackConnectors.slack.errorPostingErrorMessage', {
    defaultMessage: 'error posting slack message',
  });
  return {
    status: 'error',
    message: errMessage,
    actionId,
    serviceMessage,
  };
}

function retryResult(
  actionId: string,
  serviceMessage: string,
  errorSource: TaskErrorSource
): ConnectorTypeExecutorResult<void> {
  const errMessage = i18n.translate(
    'xpack.stackConnectors.slack.errorPostingRetryLaterErrorMessage',
    {
      defaultMessage: 'error posting a slack message, retry later',
    }
  );
  return {
    status: 'error',
    message: errMessage,
    retry: true,
    actionId,
    errorSource,
    serviceMessage,
  };
}

function retryResultSeconds(
  actionId: string,
  message: string,
  retryAfter: number
): ConnectorTypeExecutorResult<void> {
  const retryEpoch = Date.now() + retryAfter * 1000;
  const retry = new Date(retryEpoch);
  const retryString = retry.toISOString();
  const errMessage = i18n.translate(
    'xpack.stackConnectors.slack.errorPostingRetryDateErrorMessage',
    {
      defaultMessage: 'error posting a slack message, retry at {retryString}',
      values: {
        retryString,
      },
    }
  );
  return {
    status: 'error',
    message: errMessage,
    retry,
    actionId,
    serviceMessage: message,
    errorSource: TaskErrorSource.USER,
  };
}
