/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegistryRuleType } from '../../../../../rule_type_registry';

export const listRuleTypesTool = (ruleTypes: Map<string, RegistryRuleType>) => {
  const types = Array.from(ruleTypes.values()).map(
    ({ id, name, producer, enabledInLicense, minimumLicenseRequired, category }) => ({
      id,
      name,
      producer,
      category,
      enabledInLicense,
      minimumLicenseRequired,
    })
  );

  return {
    content: [{ type: 'text' as const, text: JSON.stringify(types, null, 2) }],
  };
};
