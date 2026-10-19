/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kbn } from './kibana_client';
import { taskOutcomes } from './await_tasks';
import { awaitExpectedTermination } from './await_termination';

jest.mock('./kibana_client', () => ({ API: '/research', kbn: jest.fn() }));
jest.mock('./await_tasks', () => ({ taskOutcomes: jest.fn() }));
const target = { url: 'http://localhost', authHeader: 'not-a-credential' };
const terminal = {
  source: 'offender_terminal',
  task_id: 'task',
  run_id: 'run',
  outcome: 'terminated',
  collateral: false,
  discarded_runs: 1,
  end: 123,
};

beforeEach(() => jest.clearAllMocks());

it('requires exact termination and positive TM failed evidence, not success', async () => {
  jest.mocked(kbn).mockResolvedValue({ status: 200, body: { hits: [terminal], last_sort: null } });
  jest.mocked(taskOutcomes).mockResolvedValue({ task: 'failed' });
  await expect(awaitExpectedTermination(target, 'task', 'run', 1000)).resolves.toEqual({
    completedAt: 123,
    terminal,
  });
});

it.each([{ outcome: 'failed' }, { collateral: true }, { discarded_runs: 2 }])(
  'rejects unexpected terminal evidence %p',
  async (change) => {
    jest.mocked(kbn).mockResolvedValue({
      status: 200,
      body: { hits: [{ ...terminal, ...change }], last_sort: null },
    });
    await expect(awaitExpectedTermination(target, 'task', 'run', 1000)).rejects.toThrow(
      'Expected one'
    );
  }
);

it('rejects a terminated task reported as successful by TM', async () => {
  jest.mocked(kbn).mockResolvedValue({ status: 200, body: { hits: [terminal], last_sort: null } });
  jest.mocked(taskOutcomes).mockResolvedValue({ task: 'success' });
  await expect(awaitExpectedTermination(target, 'task', 'run', 1000)).rejects.toThrow(
    'incorrectly reported success'
  );
});

it('missing exact run/task terminal evidence is not accepted', async () => {
  jest.mocked(kbn).mockResolvedValue({
    status: 200,
    body: { hits: [{ ...terminal, run_id: 'other' }], last_sort: null },
  });
  await expect(awaitExpectedTermination(target, 'task', 'run', 1)).rejects.toThrow('No positive');
  expect(taskOutcomes).not.toHaveBeenCalled();
});
