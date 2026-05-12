/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';

export interface KeywordsEvaluatorConfig {
  required?: string[];
  forbidden?: string[];
  caseSensitive?: boolean;
}

export const createKeywordsEvaluator = (config: KeywordsEvaluatorConfig): Evaluator => ({
  name: 'keywords',
  kind: 'CODE',
  evaluate: async ({ output }) => {
    const content = typeof output === 'string' ? output : JSON.stringify(output);
    const normalizedContent = config.caseSensitive ? content : content.toLowerCase();

    const missingRequired: string[] = [];
    const foundForbidden: string[] = [];

    for (const keyword of config.required ?? []) {
      const normalizedKeyword = config.caseSensitive ? keyword : keyword.toLowerCase();
      if (!normalizedContent.includes(normalizedKeyword)) {
        missingRequired.push(keyword);
      }
    }

    for (const keyword of config.forbidden ?? []) {
      const normalizedKeyword = config.caseSensitive ? keyword : keyword.toLowerCase();
      if (normalizedContent.includes(normalizedKeyword)) {
        foundForbidden.push(keyword);
      }
    }

    const totalChecks = (config.required?.length ?? 0) + (config.forbidden?.length ?? 0);
    const failedChecks = missingRequired.length + foundForbidden.length;

    if (totalChecks === 0) {
      return { score: 1.0, label: 'pass', explanation: 'No keyword checks configured' };
    }

    const score = Math.max(0, 1.0 - failedChecks / totalChecks);

    const explanationParts: string[] = [];
    if (missingRequired.length > 0) {
      explanationParts.push(`Missing required: ${missingRequired.join(', ')}`);
    }
    if (foundForbidden.length > 0) {
      explanationParts.push(`Found forbidden: ${foundForbidden.join(', ')}`);
    }

    if (failedChecks === 0) {
      return { score: 1.0, label: 'pass', explanation: `All ${totalChecks} keyword checks passed` };
    }

    return {
      score,
      label: score >= 0.5 ? 'warn' : 'fail',
      explanation: explanationParts.join('; '),
      metadata: { missingRequired, foundForbidden },
    };
  },
});
