/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Anonymization, RegexAnonymizationRule } from '@kbn/inference-common';
import { AnonymizationState } from './types';
import { getEntityMask } from './get_entity_mask';

/**
 * Executes a regex anonymization rule, by iterating over the matches,
 * and replacing each occurrence with a masked value.
 */
export function executeRegexRule({
  state,
  rule,
}: {
  state: AnonymizationState;
  rule: RegexAnonymizationRule;
}): AnonymizationState {
  const regex = new RegExp(rule.pattern, 'g');

  const anonymizations: Anonymization[] = state.anonymizations.concat();

  const nextRecords = state.records.map((record) => {
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
