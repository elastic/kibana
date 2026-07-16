/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthorizedRuleTypes, RegistryAlertTypeWithAuth } from '../../../../authorization';
import {
  AlertingAuthorizationEntity,
  ReadOperations,
  WriteOperations,
} from '../../../../authorization';
import type { RulesClientContext } from '../../../../rules_client/types';

export interface ListRuleTypesOptions {
  /**
   * When true, the returned set additionally includes rule types the user is
   * authorized to read as alerts (the `alert` authorization entity), not only
   * those they can read/create as rules. This is used by alert views (e.g. the
   * Stack alerts page and the dashboard alert panel embeddable) that need the
   * list of rule types whose alerts the user can see, including alerts-only
   * users who hold `alert/get` but not `rule/*` privileges.
   */
  includeAlertViewableTypes?: boolean;
}

export async function listRuleTypes(
  context: RulesClientContext,
  options: ListRuleTypesOptions = {}
): Promise<RegistryAlertTypeWithAuth[]> {
  const { includeAlertViewableTypes = false } = options;
  const registeredRuleTypes = context.ruleTypeRegistry.list();
  const ruleTypeIds = Array.from(registeredRuleTypes.keys());

  const authorizedRuleTypes = await context.authorization.getAuthorizedRuleTypes({
    authorizationEntity: AlertingAuthorizationEntity.Rule,
    operations: [ReadOperations.Get, WriteOperations.Create],
    ruleTypeIds,
  });

  if (includeAlertViewableTypes) {
    const alertAuthorizedRuleTypes = await context.authorization.getAuthorizedRuleTypes({
      authorizationEntity: AlertingAuthorizationEntity.Alert,
      operations: [ReadOperations.Get],
      ruleTypeIds,
    });

    mergeAuthorizedRuleTypes(authorizedRuleTypes, alertAuthorizedRuleTypes);
  }

  return Array.from(authorizedRuleTypes.entries())
    .filter(([id, _]) => context.ruleTypeRegistry.has(id))
    .map(([id, { authorizedConsumers }]) => ({
      ...registeredRuleTypes.get(id)!,
      authorizedConsumers,
    }));
}

/**
 * Merges `source` into `target` in place: unions the rule type ids and, for
 * overlapping rule types, unions the authorized consumers (OR-ing the
 * `read`/`all` flags per consumer).
 */
function mergeAuthorizedRuleTypes(target: AuthorizedRuleTypes, source: AuthorizedRuleTypes): void {
  for (const [ruleTypeId, { authorizedConsumers }] of source.entries()) {
    const existing = target.get(ruleTypeId);

    if (!existing) {
      target.set(ruleTypeId, { authorizedConsumers: { ...authorizedConsumers } });
      continue;
    }

    const mergedConsumers = { ...existing.authorizedConsumers };
    for (const [consumer, privileges] of Object.entries(authorizedConsumers)) {
      const current = mergedConsumers[consumer];
      mergedConsumers[consumer] = {
        read: Boolean(current?.read || privileges.read),
        all: Boolean(current?.all || privileges.all),
      };
    }

    target.set(ruleTypeId, { authorizedConsumers: mergedConsumers });
  }
}
