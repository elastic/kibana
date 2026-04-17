/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { executionContextServiceMock } from '@kbn/core-execution-context-server-mocks';

// import type { ExecutionContextRunner } from './execution_context';
import { getExecutionContextRunner } from './execution_context';

function getContextSetup() {
  return executionContextServiceMock.createInternalSetupContract();
}

describe('execution_context', () => {
  describe('getExecutionContextRunner', () => {
    test('works as expected for async usage', async () => {
      const contextSetup = getContextSetup();
      const runner = getExecutionContextRunner(contextSetup, {
        id: 'foo',
        name: 'bar',
      });

      const result = await runner.run(async () => Promise.resolve(42));
      expect(result).toBe(42);

      expect(contextSetup.withContext).toBeCalledWith(
        {
          id: 'foo',
          name: 'bar',
          type: 'task manager',
        },
        expect.any(Function)
      );
    });

    test('works as expected for sync usage', async () => {
      const contextSetup = getContextSetup();
      const runner = getExecutionContextRunner(contextSetup, {
        id: 'foo',
        name: 'bar',
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await runner.run(() => 42 as any);
      expect(result).toBe(42);

      expect(contextSetup.withContext).toBeCalledWith(
        {
          id: 'foo',
          name: 'bar',
          type: 'task manager',
        },
        expect.any(Function)
      );
    });

    test('type can not be overridden', async () => {
      const contextSetup = getContextSetup();
      const runner = getExecutionContextRunner(contextSetup, {
        type: 'kinda global',
      });

      const result = await runner.run(async () => Promise.resolve(42), {
        type: 'more local',
      });
      expect(result).toBe(42);

      expect(contextSetup.withContext).toBeCalledWith(
        {
          type: 'task manager',
        },
        expect.any(Function)
      );
    });

    test('top-level properties cannot be overridden', async () => {
      const contextSetup = getContextSetup();
      const runner = getExecutionContextRunner(contextSetup, {
        id: 'kinda global',
      });

      const result = await runner.run(async () => Promise.resolve(42), {
        id: 'more local',
      });
      expect(result).toBe(42);

      expect(contextSetup.withContext).toBeCalledWith(
        {
          type: 'task manager',
          id: 'kinda global',
        },
        expect.any(Function)
      );
    });

    test('works with no extra properties', async () => {
      const contextSetup = getContextSetup();
      const runner = getExecutionContextRunner(contextSetup);

      const result = await runner.run(async () => Promise.resolve(42));
      expect(result).toBe(42);

      expect(contextSetup.withContext).toBeCalledWith(
        {
          type: 'task manager',
        },
        expect.any(Function)
      );
    });

    test('works with no top-level properties', async () => {
      const contextSetup = getContextSetup();
      const runner = getExecutionContextRunner(contextSetup);

      const result = await runner.run(async () => Promise.resolve(42), { id: 'foo' });
      expect(result).toBe(42);

      expect(contextSetup.withContext).toBeCalledWith(
        {
          type: 'task manager',
          id: 'foo',
        },
        expect.any(Function)
      );
    });
  });
});
