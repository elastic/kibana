/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { RegistryRuleType } from '../../rule_type_registry';
import type { RulesClient } from '../../rules_client';

export const validateInternalRuleTypesByQuery = async ({
  req,
  ruleTypes,
  rulesClient,
  operationText,
}: {
  req: { filter?: string; ids?: string[] };
  ruleTypes: Map<string, RegistryRuleType>;
  rulesClient: RulesClient;
  operationText: string;
}) => {
  const { filter, ids } = req;

  if (!filter && (!ids || ids.length === 0)) {
    return;
  }

  const ruleTypesByQuery = await rulesClient.getRuleTypesByQuery({ filter, ids });
  const ruleTypeIds = new Set(ruleTypesByQuery.ruleTypes);
  const notFoundRuleTypeIds = new Set<string>();
  const internalRuleTypeIds = new Set<string>();

  const constructMessage = (idsToFormat: Set<string>) => Array.from(idsToFormat).join(', ');

  for (const ruleTypeId of ruleTypeIds) {
    const ruleType = ruleTypes.get(ruleTypeId);

    if (!ruleType) {
      notFoundRuleTypeIds.add(ruleTypeId);
    }

    if (ruleType?.internallyManaged) {
      internalRuleTypeIds.add(ruleTypeId);
    }
  }

  if (notFoundRuleTypeIds.size) {
    throw Boom.badRequest(`Rule types not found: ${constructMessage(notFoundRuleTypeIds)}`);
  }

  if (internalRuleTypeIds.size) {
    throw Boom.badRequest(
      `Cannot ${operationText} rules of type "${constructMessage(
        internalRuleTypeIds
      )}" because they are internally managed.`
    );
  }
};

export const validateInternalRuleTypesBulkOperation = async ({
  ids,
  ruleTypes,
  rulesClient,
  operationText,
}: {
  ids?: string[];
  ruleTypes: Map<string, RegistryRuleType>;
  rulesClient: RulesClient;
  operationText: string;
}) => {
  await validateInternalRuleTypesByQuery({
    req: { ids },
    ruleTypes,
    rulesClient,
    operationText,
  });
};
