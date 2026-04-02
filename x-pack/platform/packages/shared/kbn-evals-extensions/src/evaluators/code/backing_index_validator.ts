/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';

const BACKING_INDEX_PATTERNS = [
  /\.ds-[\w.*-]+-\d{4}\.\d{2}\.\d{2}-\d{6}/g, // Data stream backing: .ds-logs-...-2024.01.01-000001
  /\.internal\.[\w.*-]+-\d{6}/g, // Internal alert backing: .internal.alerts-...-000001
];

/**
 * Matches generic rollover indices like `...-000001` while avoiding false positives
 * on date suffixes (e.g., `-20240101`), version strings, and common numeric patterns.
 */
const GENERIC_ROLLOVER_PATTERN = /(?<![.\d])[\w.*-]+-\d{6}(?!\d)/g;

const suggestCorrectName = (backingIndex: string): string | null => {
  // .ds-logs-endpoint.events.process-default-2024.01.01-000001 → logs-endpoint.events.process-default
  const dsMatch = backingIndex.match(/^\.ds-(.*?)-\d{4}\.\d{2}\.\d{2}-\d{6}$/);
  if (dsMatch) {
    return dsMatch[1];
  }

  // .internal.alerts-security.alerts-default-000001 → .alerts-security.alerts-default
  const internalMatch = backingIndex.match(/^\.internal\.(.*?)-\d{6}$/);
  if (internalMatch) {
    return `.${internalMatch[1]}`;
  }

  return null;
};

export const createBackingIndexValidator = (): Evaluator => ({
  name: 'backing-index-validator',
  kind: 'CODE',
  evaluate: async ({ output }) => {
    const content = typeof output === 'string' ? output : JSON.stringify(output);
    const issues: Array<{ match: string; suggestion: string | null }> = [];

    for (const pattern of BACKING_INDEX_PATTERNS) {
      // Reset regex lastIndex since we reuse global patterns
      pattern.lastIndex = 0;
      let match = pattern.exec(content);
      while (match) {
        issues.push({ match: match[0], suggestion: suggestCorrectName(match[0]) });
        match = pattern.exec(content);
      }
    }

    // Check generic rollover pattern separately to allow dedup
    GENERIC_ROLLOVER_PATTERN.lastIndex = 0;
    let genericMatch = GENERIC_ROLLOVER_PATTERN.exec(content);
    const seenMatches = new Set(issues.map((i) => i.match));
    while (genericMatch) {
      if (!seenMatches.has(genericMatch[0])) {
        issues.push({ match: genericMatch[0], suggestion: suggestCorrectName(genericMatch[0]) });
        seenMatches.add(genericMatch[0]);
      }
      genericMatch = GENERIC_ROLLOVER_PATTERN.exec(content);
    }

    if (issues.length === 0) {
      return { score: 1.0, label: 'pass', explanation: 'No backing index references found' };
    }

    const explanations = issues.map(
      (i) =>
        `Found backing index "${i.match}"${i.suggestion ? ` → use "${i.suggestion}" instead` : ''}`
    );

    return {
      score: 0.0,
      label: 'fail',
      explanation: `Found ${issues.length} backing index reference(s): ${explanations.join('; ')}`,
      metadata: { issues },
    };
  },
});
