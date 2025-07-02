/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { initRegexWorker, runRegexTask } from './regex_worker';
import { RegexAnonymizationRule } from '@kbn/inference-common';
beforeAll(() => initRegexWorker());

it('aborts regex task and restarts pool', async () => {
  const rule: RegexAnonymizationRule = {
    type: 'RegExp',
    enabled: true,
    entityClass: 'TEST',
    pattern: '(a+)+$',
  };

  const longA = 'a'.repeat(10_000) + 'b';

  // call helper with very small TTL just for this test
  await expect(runRegexTask({ rule, records: [{ content: longA }] }, 1)).rejects.toThrow(
    /timed out/i
  );
});
