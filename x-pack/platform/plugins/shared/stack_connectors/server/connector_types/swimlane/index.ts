/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  ActionType as ConnectorType,
  ActionTypeExecutorOptions as ConnectorTypeExecutorOptions,
  ActionTypeExecutorResult as ConnectorTypeExecutorResult,
} from '@kbn/actions-plugin/server/types';
import {
  AlertingConnectorFeatureId,
  CasesConnectorFeatureId,
  SecurityConnectorFeatureId,
} from '@kbn/actions-plugin/common';
import {
  SwimlaneExecutorResultData,
  SwimlanePublicConfigurationType,
  SwimlaneSecretConfigurationType,
  ExecutorParams,
  ExecutorSubActionPushParams,
} from './types';
import { validate } from './validators';
import {
  ExecutorParamsSchema,
  SwimlaneSecretsConfigurationSchema,
  SwimlaneServiceConfigurationSchema,
} from './schema';
import { createExternalService } from './service';
import { api } from './api';

const supportedSubActions: string[] = ['pushToService'];

// connector type definition
export function getConnectorType(): ConnectorType<
  SwimlanePublicConfigurationType,
  SwimlaneSecretConfigurationType,
  ExecutorParams,
  SwimlaneExecutorResultData | {}
> {
  return {
    id: '.swimlane',
    minimumLicenseRequired: 'gold',
    name: i18n.translate('xpack.stackConnectors.swimlane.title', {
      defaultMessage: 'Swimlane',
    }),
    supportedFeatureIds: [
      AlertingConnectorFeatureId,
      CasesConnectorFeatureId,
      SecurityConnectorFeatureId,
    ],
    validate: {
      config: {
        schema: SwimlaneServiceConfigurationSchema,
        customValidator: validate.config,
      },
      secrets: {
        schema: SwimlaneSecretsConfigurationSchema,
        customValidator: validate.secrets,
      },
      params: {
        schema: ExecutorParamsSchema,
      },
    },
    executor,
  };
}

async function executor(
  execOptions: ConnectorTypeExecutorOptions<
    SwimlanePublicConfigurationType,
    SwimlaneSecretConfigurationType,
    ExecutorParams
  >
): Promise<ConnectorTypeExecutorResult<SwimlaneExecutorResultData | {}>> {
  const {
    actionId,
    config,
    params,
    secrets,
    configurationUtilities,
    logger,
    connectorUsageCollector,
  } = execOptions;
  const { subAction, subActionParams } = params as ExecutorParams;
  let data: SwimlaneExecutorResultData | null = null;

  const externalService = createExternalService(
    {
      config,
      secrets,
    },
    logger,
    configurationUtilities,
    connectorUsageCollector
  );

  if (!api[subAction]) {
    const errorMessage = `[Action][ExternalService] -> [Swimlane] Unsupported subAction type ${subAction}.`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  if (!supportedSubActions.includes(subAction)) {
    const errorMessage = `[Action][ExternalService] -> [Swimlane] subAction ${subAction} not implemented.`;
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

    logger.debug(`response push to service for incident id: ${data.id}`);
  }

  return { status: 'ok', data: data ?? {}, actionId };
}
