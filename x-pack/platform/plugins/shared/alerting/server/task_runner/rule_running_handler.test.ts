/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';
import type { ISavedObjectsRepository, Logger } from '@kbn/core/server';

import { partiallyUpdateRule } from '../saved_objects/partially_update_rule';
import { RuleRunningHandler } from './rule_running_handler';

vi.mock('../saved_objects/partially_update_rule', () => {
      const mocked = {
      partiallyUpdateRule: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

describe('isRunning handler', () => {
  const soClient = vi.fn() as unknown as ISavedObjectsRepository;
  const logger = {
    error: vi.fn(),
  } as unknown as Logger;
  const ruleTypeId = 'myType';
  beforeEach(() => {
    (partiallyUpdateRule as Mock).mockClear();
    (logger.error as Mock).mockClear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test('Should resolve if nothing got started', async () => {
    (partiallyUpdateRule as Mock).mockImplementation(() => Promise.resolve('resolve'));
    const runHandler = new RuleRunningHandler(soClient, logger, ruleTypeId);
    const resp = await runHandler.waitFor();
    expect(partiallyUpdateRule).toHaveBeenCalledTimes(0);
    expect(logger.error).toHaveBeenCalledTimes(0);
    expect(resp).toBe(undefined);
  });

  test('Should return the promise from partiallyUpdateRule when the update isRunning has been a success', async () => {
    (partiallyUpdateRule as Mock).mockImplementation(() => Promise.resolve('resolve'));
    const runHandler = new RuleRunningHandler(soClient, logger, ruleTypeId);
    runHandler.start('9876543210');
    vi.runAllTimers();
    const resp = await runHandler.waitFor();

    expect(partiallyUpdateRule).toHaveBeenCalledTimes(1);
    expect((partiallyUpdateRule as Mock).mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        [MockFunction],
        "9876543210",
        Object {
          "running": true,
        },
        Object {
          "ignore404": true,
          "namespace": undefined,
          "refresh": false,
        },
      ]
    `);
    expect(logger.error).toHaveBeenCalledTimes(0);
    expect(resp).toBe('resolve');
  });

  test('Should reject when the update isRunning has been a failure', async () => {
    (partiallyUpdateRule as Mock).mockImplementation(() => Promise.reject(new Error('error')));
    const runHandler = new RuleRunningHandler(soClient, logger, ruleTypeId);
    runHandler.start('9876543210');
    vi.runAllTimers();

    await expect(runHandler.waitFor()).rejects.toThrow();
    expect(partiallyUpdateRule).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});
