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

  const ruleTypesByQuery = await rulesClient.getRuleTypesByQuery({ filter, ids });
  const ruleTypeIds = new Set(ruleTypesByQuery.ruleTypes);

  for (const ruleTypeId of ruleTypeIds) {
    const ruleType = ruleTypes.get(ruleTypeId);

    if (!ruleType) {
      throw Boom.badRequest('Rule type not found');
    }

    if (ruleType.internallyManaged) {
      throw Boom.badRequest(
        `Cannot ${operationText} rule of type "${ruleType.id}" because it is internally managed.`
      );
    }
  }
};
