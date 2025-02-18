/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ActionType as ConnectorType,
  ActionTypeExecutorOptions as ConnectorTypeExecutorOptions,
  ActionTypeExecutorResult as ConnectorTypeExecutorResult,
} from '@kbn/actions-plugin/server/types';
import { CasesConnectorFeatureId } from '@kbn/actions-plugin/common';
import {
  CasesWebhookActionParamsType,
  CasesWebhookExecutorResultData,
  CasesWebhookPublicConfigurationType,
  CasesWebhookSecretConfigurationType,
  ExecutorParams,
  ExecutorSubActionPushParams,
} from './types';
import { createExternalService } from './service';
import {
  ExecutorParamsSchema,
  ExternalIncidentServiceConfigurationSchema,
  ExternalIncidentServiceSecretConfigurationSchema,
} from './schema';
import { api } from './api';
import { validateCasesWebhookConfig, validateConnector } from './validators';
import * as i18n from './translations';

const supportedSubActions: string[] = ['pushToService'];
export type ActionParamsType = CasesWebhookActionParamsType;
export const ConnectorTypeId = '.cases-webhook';

// connector type definition
export function getConnectorType(): ConnectorType<
  CasesWebhookPublicConfigurationType,
  CasesWebhookSecretConfigurationType,
  ExecutorParams,
  CasesWebhookExecutorResultData
> {
  return {
    id: ConnectorTypeId,
    minimumLicenseRequired: 'gold',
    name: i18n.NAME,
    validate: {
      config: {
        schema: ExternalIncidentServiceConfigurationSchema,
        customValidator: validateCasesWebhookConfig,
      },
      secrets: {
        schema: ExternalIncidentServiceSecretConfigurationSchema,
      },
      params: {
        schema: ExecutorParamsSchema,
      },
      connector: validateConnector,
    },
    executor,
    supportedFeatureIds: [CasesConnectorFeatureId],
  };
}

// action executor
export async function executor(
  execOptions: ConnectorTypeExecutorOptions<
    CasesWebhookPublicConfigurationType,
    CasesWebhookSecretConfigurationType,
    CasesWebhookActionParamsType
  >
): Promise<ConnectorTypeExecutorResult<CasesWebhookExecutorResultData>> {
  const { actionId, configurationUtilities, params, logger, connectorUsageCollector } = execOptions;
  const { subAction, subActionParams } = params;
  let data: CasesWebhookExecutorResultData | undefined;

  const externalService = createExternalService(
    actionId,
    {
      config: execOptions.config,
      secrets: execOptions.secrets,
    },
    logger,
    configurationUtilities,
    connectorUsageCollector
  );

  if (!api[subAction]) {
    const errorMessage = `[Action][ExternalService] Unsupported subAction type ${subAction}.`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  if (!supportedSubActions.includes(subAction)) {
    const errorMessage = `[Action][ExternalService] subAction ${subAction} not implemented.`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  if (subAction === 'pushToService') {
    const pushToServiceParams = subActionParams as ExecutorSubActionPushParams;
    data = await api.pushToService({
      externalService,
      params: pushToServiceParams,
      logger,
    });

    logger.debug(`response push to service for case id: ${data.id}`);
  }

  return { status: 'ok', data, actionId };
}
