/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('just-bash', () => {
  throw new Error('just-bash must not load with the Agent Builder runner');
});

it('does not load just-bash when the runner is loaded at startup', async () => {
  const { RunnerManager } = await import('../runner');
  expect(RunnerManager).toBeDefined();
});
