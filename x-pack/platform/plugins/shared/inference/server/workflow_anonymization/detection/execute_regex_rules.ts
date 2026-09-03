/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RE2JS } from 're2js';
import type { PiiRegexRule, PiiRegexMatch, PiiRegexWorkerTaskPayload } from './types';

/**
 * Executes a set of RE2 regex rules against a batch of text records.
 *
 * Designed to run inside a Piscina worker — throws on any invalid pattern so the
 * caller can apply its own failure-mode policy.
 *
 * Zero-length matches advance one character and continue scanning; they do not
 * terminate the search for that field (unlike the snapshot which used `break`).
 */
export const executeRegexRules = ({
  rules,
  records,
}: PiiRegexWorkerTaskPayload): PiiRegexMatch[] => {
  const results: PiiRegexMatch[] = [];

  for (let ruleIndex = 0; ruleIndex < rules.length; ruleIndex++) {
    const rule = rules[ruleIndex] as PiiRegexRule;
    const pattern = RE2JS.compile(rule.pattern);

    for (let recordIndex = 0; recordIndex < records.length; recordIndex++) {
      const record = records[recordIndex];
      for (const [recordKey, value] of Object.entries(record)) {
        if (typeof value !== 'string' || value.length === 0) {
          continue;
        }

        const matcher = pattern.matcher(value);
        let pos: number | null = null;

        while (true) {
          const found = pos === null ? matcher.find() : matcher.find(pos);
          pos = null;
          if (!found) break;

          const start = matcher.start();
          const end = matcher.end();

          if (end <= start) {
            // Zero-length match: advance one character and keep scanning
            const next = start + 1;
            if (next > value.length) break;
            pos = next;
            continue;
          }

          const matchValue = matcher.group();
          if (matchValue === null) continue;

          if (rule.maxMatchLength !== undefined && matchValue.length > rule.maxMatchLength) {
            continue;
          }

          results.push({
            ruleIndex,
            recordIndex,
            recordKey,
            start,
            end,
            matchValue,
            entityClass: rule.entityClass,
          });
        }
      }
    }
  }

  return results;
};
