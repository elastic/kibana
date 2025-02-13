/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import { getIndexTemplateAndPattern } from '../alerts_service/resource_installer_utils';
import { RuleTypeRegistry } from '../rule_type_registry';

export type GetAlertIndicesAlias = (rulesTypes: string[], spaceId?: string) => string[];

export function createGetAlertIndicesAliasFn(ruleTypeRegistry: RuleTypeRegistry) {
  return (rulesTypes: string[], spaceId?: string): string[] => {
    const aliases = new Set<string>();
    rulesTypes.forEach((ruleTypeId) => {
      const ruleType = ruleTypeRegistry.get(ruleTypeId);
      if (ruleType.alerts?.context) {
        const indexTemplateAndPattern = getIndexTemplateAndPattern({
          context: ruleType.alerts?.context,
          namespace: ruleType.alerts?.isSpaceAware && spaceId ? spaceId : DEFAULT_NAMESPACE_STRING,
        });
        aliases.add(indexTemplateAndPattern.alias);
      }
    });
    return Array.from(aliases);
  };
}
