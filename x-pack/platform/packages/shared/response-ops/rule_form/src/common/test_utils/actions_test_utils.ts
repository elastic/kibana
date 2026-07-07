/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionType } from '@kbn/actions-types';
import type { RuleSystemAction } from '@kbn/alerting-types';
import type {
  ActionConnector,
  ActionTypeModel,
  GenericValidationResult,
  RuleAction,
} from '@kbn/alerts-ui-shared';
import { actionTypeRegistryMock } from '@kbn/alerts-ui-shared/src/common/test_utils/action_type_registry.mock';

export const getConnector = (
  id: string,
  overwrites?: Partial<ActionConnector>
): ActionConnector => {
  return {
    id: `connector-${id}`,
    secrets: { secret: 'secret' },
    actionTypeId: `actionType-${id}`,
    name: `connector-${id}`,
    config: { config: `config-${id}` },
    isPreconfigured: false,
    isSystemAction: false,
    isDeprecated: false,
    isConnectorTypeDeprecated: false,
    ...overwrites,
  };
};

export const getAction = (id: string, overwrites?: Partial<RuleAction>): RuleAction => {
  return {
    id: `action-${id}`,
    uuid: `uuid-action-${id}`,
    group: `group-${id}`,
    actionTypeId: `actionType-${id}`,
    params: {},
    ...overwrites,
  };
};

export const getSystemAction = (
  id: string,
  overwrites?: Partial<RuleSystemAction>
): RuleSystemAction => {
  return {
    uuid: `uuid-system-action-${id}`,
    id: `system-action-${id}`,
    actionTypeId: `actionType-${id}`,
    params: {},
    ...overwrites,
  };
};

export const getActionType = (id: string, overwrites?: Partial<ActionType>): ActionType => {
  return {
    id: `actionType-${id}`,
    name: `actionType: ${id}`,
    enabled: true,
    enabledInConfig: true,
    enabledInLicense: true,
    minimumLicenseRequired: 'basic',
    supportedFeatureIds: ['stackAlerts'],
    isSystemActionType: false,
    isDeprecated: false,
    ...overwrites,
  };
};

export const getActionTypeModel = (
  id: string,
  overwrites?: Partial<ActionTypeModel>
): ActionTypeModel => {
  return actionTypeRegistryMock.createMockActionTypeModel({
    id: `actionTypeModel-${id}`,
    iconClass: 'test',
    selectMessage: 'test',
    validateParams: (): Promise<GenericValidationResult<unknown>> => {
      const validationResult = { errors: {} };
      return Promise.resolve(validationResult);
    },
    actionConnectorFields: null,
    ...overwrites,
  });
};
