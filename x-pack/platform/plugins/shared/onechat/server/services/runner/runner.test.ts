/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toSerializedToolIdentifier } from '@kbn/onechat-common';
import type {
  ScopedRunnerRunToolsParams,
  RunToolParams,
  OnechatRunEvent,
} from '@kbn/onechat-server';
import {
  createScopedRunnerDepsMock,
  createMockedTool,
  CreateScopedRunnerDepsMock,
  MockedTool,
} from '../../test_utils';
import { createScopedRunner, createRunner, runTool, RunnerManager } from './runner';

describe('Onechat runner', () => {
  let runnerDeps: CreateScopedRunnerDepsMock;
  let runnerManager: RunnerManager;

  beforeEach(() => {
    runnerDeps = createScopedRunnerDepsMock();
    runnerManager = new RunnerManager(runnerDeps);
  });

  describe('runTool', () => {
    let tool: MockedTool;

    beforeEach(() => {
      const {
        toolsService: { registry },
      } = runnerDeps;

      tool = createMockedTool({});
      registry.get.mockResolvedValue(tool);
    });

    it('calls the tool registry with the expected parameters', async () => {
      const {
        toolsService: { registry },
      } = runnerDeps;

      const params: ScopedRunnerRunToolsParams = {
        toolId: 'test-tool',
        toolParams: { foo: 'bar' },
      };

      await runTool({
        toolExecutionParams: params,
        parentManager: runnerManager,
      });

      expect(registry.get).toHaveBeenCalledTimes(1);
      expect(registry.get).toHaveBeenCalledWith({
        toolId: params.toolId,
        request: runnerDeps.request,
      });
    });

    it('calls the tool handler with the expected parameters', async () => {
      const params: ScopedRunnerRunToolsParams = {
        toolId: 'test-tool',
        toolParams: { foo: 'bar' },
      };

      await runTool({
        toolExecutionParams: params,
        parentManager: runnerManager,
      });

      expect(tool.handler).toHaveBeenCalledTimes(1);
      expect(tool.handler).toHaveBeenCalledWith(params.toolParams, expect.any(Object));
    });

    it('returns the expected value', async () => {
      const params: ScopedRunnerRunToolsParams = {
        toolId: 'test-tool',
        toolParams: {},
      };

      tool.handler.mockReturnValue({ test: true, over: 9000 });

      const result = await runTool({
        toolExecutionParams: params,
        parentManager: runnerManager,
      });

      expect(result).toEqual({
        result: { test: true, over: 9000 },
      });
    });

    it('exposes a context with the expected shape to the tool handler', async () => {
      const params: ScopedRunnerRunToolsParams = {
        toolId: 'test-tool',
        toolParams: {},
      };

      tool.handler.mockImplementation((toolParams, context) => {
        return 'foo';
      });

      await runTool({
        toolExecutionParams: params,
        parentManager: runnerManager,
      });

      expect(tool.handler).toHaveBeenCalledTimes(1);
      const context = tool.handler.mock.lastCall![1];

      expect(context).toEqual(
        expect.objectContaining({
          request: runnerDeps.request,
          esClient: expect.anything(),
          modelProvider: expect.anything(),
          runner: expect.anything(),
        })
      );
    });

    it('exposes an event emitter to the tool handler caller can attach to using the onEvent param', async () => {
      const emittedEvents: OnechatRunEvent[] = [];

      const params: ScopedRunnerRunToolsParams = {
        toolId: 'test-tool',
        toolParams: {},
        onEvent: (event) => {
          emittedEvents.push(event);
        },
      };

      tool.handler.mockImplementation((toolParams, { events }) => {
        events.emit({
          type: 'test-event',
          data: { foo: 'bar' },
          meta: { hello: 'dolly' },
        });
        return 42;
      });

      await runTool({
        toolExecutionParams: params,
        parentManager: runnerManager,
      });

      expect(emittedEvents).toHaveLength(1);
      expect(emittedEvents[0]).toEqual({
        type: 'test-event',
        data: {
          foo: 'bar',
        },
        meta: {
          hello: 'dolly',
          runId: expect.any(String),
          stack: [
            {
              type: 'tool',
              toolId: toSerializedToolIdentifier('test-tool'),
            },
          ],
        },
      });
    });

    it('can be invoked through a scoped runner', async () => {
      tool.handler.mockReturnValue({ someProp: 'someValue' });

      const params: ScopedRunnerRunToolsParams = {
        toolId: 'test-tool',
        toolParams: { foo: 'bar' },
      };

      const runner = createScopedRunner(runnerDeps);
      const response = await runner.runTool(params);

      expect(tool.handler).toHaveBeenCalledTimes(1);
      expect(tool.handler).toHaveBeenCalledWith(params.toolParams, expect.any(Object));

      expect(response).toEqual({
        result: { someProp: 'someValue' },
      });
    });

    it('can be invoked through a runner', async () => {
      tool.handler.mockReturnValue({ someProp: 'someValue' });

      const { request, ...otherRunnerDeps } = runnerDeps;

      const params: RunToolParams = {
        toolId: 'test-tool',
        toolParams: { foo: 'bar' },
        request,
      };

      const runner = createRunner(otherRunnerDeps);
      const response = await runner.runTool(params);

      expect(tool.handler).toHaveBeenCalledTimes(1);
      expect(tool.handler).toHaveBeenCalledWith(params.toolParams, expect.any(Object));

      expect(response).toEqual({
        result: { someProp: 'someValue' },
      });
    });
  });
});
