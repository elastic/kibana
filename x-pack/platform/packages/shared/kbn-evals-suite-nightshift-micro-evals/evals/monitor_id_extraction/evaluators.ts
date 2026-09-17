/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pythonRepr, pythonRound } from '../../src/python';
import type { MonitorEvaluator } from './types';

export const codeEvaluators: MonitorEvaluator[] = [
  {
    name: 'exact_match',
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async ({ output, expected }) => {
      const actual = (output.monitor_id || '').trim();
      const reference = (expected.expected_monitor_id || '').trim();
      const score = Number(actual === reference);
      return {
        score,
        explanation:
          score === 1
            ? 'exact match'
            : `got ${pythonRepr(actual)}, expected ${pythonRepr(reference)}`,
      };
    },
  },
  {
    name: 'non_empty_output',
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async ({ output, expected }) => {
      const actual = (output.monitor_id || '').trim();
      const reference = (expected.expected_monitor_id || '').trim();
      const expectedEmpty = reference === '';
      const actualEmpty = actual === '';
      if (expectedEmpty === actualEmpty)
        return {
          score: 1,
          explanation: expectedEmpty ? 'empty abstention correct' : 'correctly non-empty',
        };
      return {
        score: 0,
        explanation: expectedEmpty
          ? `expected empty but got ${pythonRepr(actual)}`
          : `expected non-empty (${pythonRepr(reference)}) but got empty string`,
      };
    },
  },
  {
    name: 'format_validity',
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async ({ output }) => {
      const actual = (output.monitor_id || '').trim();
      if (!actual) return { score: 1, explanation: 'empty string is valid' };
      const checks: Array<[string, boolean]> = [
        ['no_leading_trailing_whitespace', actual === actual.trim()],
        ['no_newlines', !actual.includes('\n') && !actual.includes('\r')],
        ['no_surrounding_quotes', !actual.startsWith('"') && !actual.startsWith("'")],
        ['no_internal_spaces', !actual.includes(' ')],
      ];
      const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
      return {
        score: pythonRound((checks.length - failures.length) / checks.length),
        explanation: failures.length ? `failed: ${failures.join(', ')}` : 'all checks passed',
      };
    },
  },
];
