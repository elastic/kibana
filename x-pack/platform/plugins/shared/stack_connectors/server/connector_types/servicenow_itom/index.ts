/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { curry } from 'lodash';

import type {
  ClassicActionType as ConnectorType,
  ActionTypeExecutorOptions as ConnectorTypeExecutorOptions,
  ActionTypeExecutorResult as ConnectorTypeExecutorResult,
} from '@kbn/actions-plugin/server/types';
import {
  AlertingConnectorFeatureId,
  SecurityConnectorFeatureId,
  WorkflowsConnectorFeatureId,
} from '@kbn/actions-plugin/common';
import type {
  ServiceNowPublicConfigurationBaseType,
  ServiceNowSecretConfigurationType,
  ExecutorSubActionGetChoicesParams,
} from '@kbn/connector-schemas/servicenow';
import type {
  ExecutorParamsITOM,
  ExecutorSubActionAddEventParams,
} from '@kbn/connector-schemas/servicenow_itom';
import {
  ExternalIncidentServiceConfigurationBaseSchema,
  ExternalIncidentServiceSecretConfigurationSchema,
} from '@kbn/connector-schemas/servicenow';
import {
  CONNECTOR_ID,
  CONNECTOR_NAME,
  ExecutorParamsSchemaITOM,
} from '@kbn/connector-schemas/servicenow_itom';
import { validate } from '../lib/servicenow/validators';
import type {
  PushToServiceResponse,
  ServiceNowExecutorResultData,
  ServiceFactory,
  ExternalServiceApiITOM,
  ExternalServiceITOM,
} from '../lib/servicenow/types';
import { snExternalServiceConfig } from '../lib/servicenow/config';
import { throwIfSubActionIsNotSupported } from '../lib/servicenow/utils';
import { createExternalService } from './service';
import { api as apiITOM } from './api';
import { createServiceWrapper } from '../lib/servicenow/create_service_wrapper';

export type ServiceNowConnectorType<
  C extends Record<string, unknown> = ServiceNowPublicConfigurationBaseType,
  T extends Record<string, unknown> = ExecutorParamsITOM
> = ConnectorType<C, ServiceNowSecretConfigurationType, T, PushToServiceResponse | {}>;

export type ServiceNowConnectorTypeExecutorOptions<
  C extends Record<string, unknown> = ServiceNowPublicConfigurationBaseType,
  T extends Record<string, unknown> = ExecutorParamsITOM
> = ConnectorTypeExecutorOptions<C, ServiceNowSecretConfigurationType, T>;

// connector type definition
export function getServiceNowITOMConnectorType(): ServiceNowConnectorType<
  ServiceNowPublicConfigurationBaseType,
  ExecutorParamsITOM
> {
  return {
    id: CONNECTOR_ID,
    minimumLicenseRequired: 'platinum',
    name: CONNECTOR_NAME,
    supportedFeatureIds: [
      AlertingConnectorFeatureId,
      SecurityConnectorFeatureId,
      WorkflowsConnectorFeatureId,
    ],
    validate: {
      config: {
        schema: ExternalIncidentServiceConfigurationBaseSchema,
        customValidator: validate.config,
      },
      secrets: {
        schema: ExternalIncidentServiceSecretConfigurationSchema,
        customValidator: validate.secrets,
      },
      connector: validate.connector,
      params: {
        schema: ExecutorParamsSchemaITOM,
      },
    },
    executor: curry(executorITOM)({
      actionTypeId: CONNECTOR_ID,
      createService: createExternalService,
      api: apiITOM,
    }),
  };
}

// action executor
const supportedSubActionsITOM = ['addEvent', 'getChoices'];
async function executorITOM(
  {
    actionTypeId,
    createService,
    api,
  }: {
    actionTypeId: string;
    createService: ServiceFactory<ExternalServiceITOM>;
    api: ExternalServiceApiITOM;
  },
  execOptions: ServiceNowConnectorTypeExecutorOptions<
    ServiceNowPublicConfigurationBaseType,
    ExecutorParamsITOM
  >
): Promise<ConnectorTypeExecutorResult<ServiceNowExecutorResultData | {}>> {
  const {
    actionId,
    config,
    params,
    secrets,
    configurationUtilities,
    logger,
    connectorUsageCollector,
  } = execOptions;
  const { subAction, subActionParams } = params;
  const connectorTokenClient = execOptions.services.connectorTokenClient;
  const externalServiceConfig = snExternalServiceConfig[actionTypeId];
  let data: ServiceNowExecutorResultData | null = null;

  const externalService = createServiceWrapper<ExternalServiceITOM>({
    connectorId: actionId,
    credentials: {
      config,
      secrets,
    },
    logger,
    configurationUtilities,
    serviceConfig: externalServiceConfig,
    connectorTokenClient,
    createServiceFn: createService,
    connectorUsageCollector,
  });

  const apiAsRecord = api as unknown as Record<string, unknown>;

  throwIfSubActionIsNotSupported({
    api: apiAsRecord,
    subAction,
    supportedSubActions: supportedSubActionsITOM,
    logger,
  });

  if (subAction === 'addEvent') {
    const eventParams = subActionParams as ExecutorSubActionAddEventParams;
    await api.addEvent({
      externalService,
      params: eventParams,
      logger,
    });
  }

  if (subAction === 'getChoices') {
    const getChoicesParams = subActionParams as ExecutorSubActionGetChoicesParams;
    data = await api.getChoices({
      externalService,
      params: getChoicesParams,
      logger,
    });
  }

  return { status: 'ok', data: data ?? {}, actionId };
}
