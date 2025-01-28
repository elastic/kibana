/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { curry } from 'lodash';

import type {
  ActionType as ConnectorType,
  ActionTypeExecutorOptions as ConnectorTypeExecutorOptions,
  ActionTypeExecutorResult as ConnectorTypeExecutorResult,
} from '@kbn/actions-plugin/server/types';
import { AlertingConnectorFeatureId, SecurityConnectorFeatureId } from '@kbn/actions-plugin/common';
import { validate } from '../lib/servicenow/validators';
import {
  ExecutorParamsSchemaITOM,
  ExternalIncidentServiceSecretConfigurationSchema,
  ExternalIncidentServiceConfigurationBaseSchema,
} from '../lib/servicenow/schema';
import * as i18n from '../lib/servicenow/translations';
import {
  ExecutorSubActionGetChoicesParams,
  PushToServiceResponse,
  ServiceNowExecutorResultData,
  ServiceNowSecretConfigurationType,
  ServiceFactory,
  ExecutorParamsITOM,
  ExecutorSubActionAddEventParams,
  ExternalServiceApiITOM,
  ExternalServiceITOM,
  ServiceNowPublicConfigurationBaseType,
} from '../lib/servicenow/types';
import { ServiceNowITOMConnectorTypeId, snExternalServiceConfig } from '../lib/servicenow/config';
import { throwIfSubActionIsNotSupported } from '../lib/servicenow/utils';
import { createExternalService } from './service';
import { api as apiITOM } from './api';
import { createServiceWrapper } from '../lib/servicenow/create_service_wrapper';

export { ServiceNowITOMConnectorTypeId };

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
    id: ServiceNowITOMConnectorTypeId,
    minimumLicenseRequired: 'platinum',
    name: i18n.SERVICENOW_ITOM,
    supportedFeatureIds: [AlertingConnectorFeatureId, SecurityConnectorFeatureId],
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
      actionTypeId: ServiceNowITOMConnectorTypeId,
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
