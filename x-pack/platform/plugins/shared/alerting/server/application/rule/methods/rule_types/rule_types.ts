/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AlertingAuthorizationEntity,
  ReadOperations,
  RegistryAlertTypeWithAuth,
  WriteOperations,
} from '../../../../authorization';
import { RulesClientContext } from '../../../../rules_client/types';

export async function listRuleTypes(
  context: RulesClientContext
): Promise<RegistryAlertTypeWithAuth[]> {
  const registeredRuleTypes = context.ruleTypeRegistry.list();

  const authorizedRuleTypes = await context.authorization.getAuthorizedRuleTypes({
    authorizationEntity: AlertingAuthorizationEntity.Rule,
    operations: [ReadOperations.Get, WriteOperations.Create],
    ruleTypeIds: Array.from(registeredRuleTypes.keys()).map((id) => id),
  });

  return Array.from(authorizedRuleTypes.entries())
    .filter(([id, _]) => context.ruleTypeRegistry.has(id))
    .map(([id, { authorizedConsumers }]) => ({
      ...registeredRuleTypes.get(id)!,
      authorizedConsumers,
    }));
}
