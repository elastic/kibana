/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/server/types';
import {
  UptimeConnectorFeatureId,
  AlertingConnectorFeatureId,
  SecurityConnectorFeatureId,
} from '@kbn/actions-plugin/common';
import { Logger } from '@kbn/core/server';
import { renderMustacheString } from '@kbn/actions-plugin/server/lib/mustache_renderer';
import type { ValidatorServices } from '@kbn/actions-plugin/server/types';
import { i18n } from '@kbn/i18n';
import type {
  SlackApiExecutorOptions,
  SlackApiConnectorType,
  SlackApiParams,
  SlackApiSecrets,
} from '../../../common/slack_api/types';
import {
  SlackApiSecretsSchema,
  SlackApiParamsSchema,
  SlackApiConfigSchema,
} from '../../../common/slack_api/schema';
import { SLACK_API_CONNECTOR_ID, SLACK_URL } from '../../../common/slack_api/constants';
import { SLACK_CONNECTOR_NAME } from './translations';
import { api } from './api';
import { createExternalService } from './service';

const supportedSubActions = ['getAllowedChannels', 'validChannelId', 'postMessage', 'postBlockkit'];

export const getConnectorType = (): SlackApiConnectorType => {
  return {
    id: SLACK_API_CONNECTOR_ID,
    minimumLicenseRequired: 'gold',
    name: SLACK_CONNECTOR_NAME,
    supportedFeatureIds: [
      UptimeConnectorFeatureId,
      AlertingConnectorFeatureId,
      SecurityConnectorFeatureId,
    ],
    validate: {
      config: { schema: SlackApiConfigSchema },
      secrets: {
        schema: SlackApiSecretsSchema,
        customValidator: validateSlackUrl,
      },
      params: {
        schema: SlackApiParamsSchema,
      },
    },
    renderParameterTemplates,
    executor: async (execOptions: SlackApiExecutorOptions) => await slackApiExecutor(execOptions),
  };
};

const validateSlackUrl = (secretsObject: SlackApiSecrets, validatorServices: ValidatorServices) => {
  const { configurationUtilities } = validatorServices;

  try {
    configurationUtilities.ensureUriAllowed(SLACK_URL);
  } catch (allowedListError) {
    throw new Error(
      i18n.translate('xpack.stackConnectors.slack_api.configurationError', {
        defaultMessage: 'error configuring slack action: {message}',
        values: {
          message: allowedListError.message,
        },
      })
    );
  }
};

const renderParameterTemplates = (
  logger: Logger,
  params: SlackApiParams,
  variables: Record<string, unknown>
) => {
  if (params.subAction === 'postMessage') {
    return {
      subAction: params.subAction,
      subActionParams: {
        ...params.subActionParams,
        text: renderMustacheString(logger, params.subActionParams.text, variables, 'slack'),
      },
    };
  } else if (params.subAction === 'postBlockkit') {
    return {
      subAction: params.subAction,
      subActionParams: {
        ...params.subActionParams,
        text: renderMustacheString(logger, params.subActionParams.text, variables, 'json'),
      },
    };
  }
  return params;
};

const slackApiExecutor = async ({
  actionId,
  config,
  params,
  secrets,
  configurationUtilities,
  logger,
  connectorUsageCollector,
}: SlackApiExecutorOptions): Promise<ActionTypeExecutorResult<unknown>> => {
  const subAction = params.subAction;

  if (!api[subAction]) {
    const errorMessage = `[Action][ExternalService] -> [Slack API] Unsupported subAction type ${subAction}.`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  if (!supportedSubActions.includes(subAction)) {
    const errorMessage = `[Action][ExternalService] -> [Slack API] subAction ${subAction} not implemented.`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  const externalService = createExternalService(
    {
      config,
      secrets,
    },
    logger,
    configurationUtilities,
    connectorUsageCollector
  );

  if (subAction === 'validChannelId') {
    return await api.validChannelId({
      externalService,
      params: params.subActionParams,
    });
  }

  if (subAction === 'postMessage') {
    return await api.postMessage({
      externalService,
      params: params.subActionParams,
    });
  }

  if (subAction === 'postBlockkit') {
    return await api.postBlockkit({
      externalService,
      params: params.subActionParams,
    });
  }

  return { status: 'ok', data: {}, actionId };
};
