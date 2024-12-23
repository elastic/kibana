/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { ActionsAuthorization, ActionsClient } from '@kbn/actions-plugin/server';
import { ConnectorAdapterRegistry } from '../connector_adapters/connector_adapter_registry';
import { getSystemActionKibanaPrivileges } from '../connector_adapters/get_system_action_kibana_privileges';
import { bulkValidateConnectorAdapterActionParams } from '../connector_adapters/validate_rule_action_params';
import { NormalizedSystemAction } from '../rules_client';
import { RuleSystemAction } from '../types';
interface Params {
  actionsClient: ActionsClient;
  actionsAuthorization: ActionsAuthorization;
  connectorAdapterRegistry: ConnectorAdapterRegistry;
  systemActions: Array<RuleSystemAction | NormalizedSystemAction>;
  rule: { consumer: string; producer: string };
}

export const validateAndAuthorizeSystemActions = async ({
  actionsClient,
  connectorAdapterRegistry,
  actionsAuthorization,
  rule,
  systemActions = [],
}: Params) => {
  if (systemActions.length === 0) {
    return;
  }

  /**
   * When updating or creating a rule the actions may not contain
   * the actionTypeId. We need to getBulk using the
   * actionsClient to get the actionTypeId of each action.
   * The actionTypeId is needed to get the schema of
   * the action params using the connector adapter registry
   */
  const actionIds: Set<string> = new Set(systemActions.map((action) => action.id));

  if (actionIds.size !== systemActions.length) {
    throw Boom.badRequest('Cannot use the same system action twice');
  }

  const actionResults = await actionsClient.getBulk({
    ids: Array.from(actionIds),
    throwIfSystemAction: false,
  });

  const systemActionsWithActionTypeId: RuleSystemAction[] = [];

  for (const systemAction of systemActions) {
    const isSystemAction = actionsClient.isSystemAction(systemAction.id);
    const foundAction = actionResults.find((actionRes) => actionRes.id === systemAction.id);

    if (!isSystemAction || !foundAction) {
      throw Boom.badRequest(`Action ${systemAction.id} is not a system action`);
    }

    systemActionsWithActionTypeId.push({
      ...systemAction,
      actionTypeId: foundAction.actionTypeId,
    });
  }

  bulkValidateConnectorAdapterActionParams({
    connectorAdapterRegistry,
    actions: systemActionsWithActionTypeId,
  });

  const additionalPrivileges = getSystemActionKibanaPrivileges({
    connectorAdapterRegistry,
    systemActions: systemActionsWithActionTypeId,
    rule: { consumer: rule.consumer, producer: rule.producer },
  });

  await actionsAuthorization.ensureAuthorized({ operation: 'execute', additionalPrivileges });
};
