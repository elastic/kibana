/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RegexAnonymizationRule } from '@kbn/inference-common';
import { Anonymization } from '@kbn/inference-common';
import { getEntityMask } from './get_entity_mask';
import { AnonymizationState } from './types';

export function executeRegexRuleTask({
  rule,
  records,
}: {
  rule: RegexAnonymizationRule;
  records: Array<Record<string, string>>;
}): AnonymizationState {
  const regex = new RegExp(rule.pattern, 'g');
  const anonymizations: Anonymization[] = [];
  const nextRecords = records.map((record: Record<string, string>) => {
    const newRecord: Record<string, string> = {};
    for (const [key, value] of Object.entries(record)) {
      newRecord[key] = value.replace(regex, (match) => {
        const mask = getEntityMask({ value: match, class_name: rule.entityClass });

        anonymizations.push({
          entity: { value: match, class_name: rule.entityClass, mask },
          rule: { type: rule.type },
        });

        return mask;
      });
    }
    return newRecord;
  });

  return { records: nextRecords, anonymizations };
}
