/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { ScopedRunnerRunToolsParams, OnechatToolEvent } from '@kbn/onechat-server';
import type { CreateScopedRunnerDepsMock, MockedTool, ToolRegistryMock } from '../../test_utils';
import {
  createScopedRunnerDepsMock,
  createMockedTool,
  createToolRegistryMock,
} from '../../test_utils';
import { RunnerManager } from './runner';
import { runTool } from './run_tool';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';

describe('runTool', () => {
  let runnerDeps: CreateScopedRunnerDepsMock;
  let runnerManager: RunnerManager;
  let registry: ToolRegistryMock;
  let tool: MockedTool;

  beforeEach(() => {
    runnerDeps = createScopedRunnerDepsMock();
    runnerManager = new RunnerManager(runnerDeps);

    registry = createToolRegistryMock();
    const {
      toolsService: { getRegistry },
    } = runnerDeps;
    getRegistry.mockResolvedValue(registry);

    tool = createMockedTool({
      schema: z.object({
        foo: z.string(),
      }),
    });
    registry.get.mockResolvedValue(tool);
  });

  it('calls the tool registry with the expected parameters', async () => {
    const params: ScopedRunnerRunToolsParams = {
      toolId: 'test-tool',
      toolParams: { foo: 'bar' },
    };

    await runTool({
      toolExecutionParams: params,
      parentManager: runnerManager,
    });

    expect(registry.get).toHaveBeenCalledTimes(1);
    expect(registry.get).toHaveBeenCalledWith(params.toolId);
  });

  it('throws if the tool parameters do not match the schema', async () => {
    tool = createMockedTool({
      schema: z.object({
        bar: z.string(),
      }),
    });
    registry.get.mockResolvedValue(tool);

    const params: ScopedRunnerRunToolsParams = {
      toolId: 'test-tool',
      toolParams: { foo: 'bar' },
    };

    await expect(
      runTool({
        toolExecutionParams: params,
        parentManager: runnerManager,
      })
    ).rejects.toThrowError(/Tool test-tool was called with invalid parameters/);
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

  it('truncates the parameters not defined on the schema', async () => {
    const params: ScopedRunnerRunToolsParams = {
      toolId: 'test-tool',
      toolParams: { foo: 'bar', extra: true },
    };

    await runTool({
      toolExecutionParams: params,
      parentManager: runnerManager,
    });

    expect(tool.handler).toHaveBeenCalledTimes(1);
    expect(tool.handler).toHaveBeenCalledWith({ foo: 'bar' }, expect.any(Object));
  });

  it('returns the expected value', async () => {
    const params: ScopedRunnerRunToolsParams = {
      toolId: 'test-tool',
      toolParams: {
        foo: 'bar',
      },
    };

    tool.handler.mockReturnValue({
      results: [{ type: ToolResultType.other, data: { test: true, over: 9000 } }],
    });

    const results = await runTool({
      toolExecutionParams: params,
      parentManager: runnerManager,
    });

    expect(results).toEqual({
      results: [{ type: ToolResultType.other, data: { test: true, over: 9000 } }],
    });
  });

  it('exposes a context with the expected shape to the tool handler', async () => {
    const params: ScopedRunnerRunToolsParams = {
      toolId: 'test-tool',
      toolParams: {
        foo: 'bar',
      },
    };

    tool.handler.mockImplementation(() => {
      return { results: [{ type: ToolResultType.other, data: { value: 42 } }] };
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
    const emittedEvents: OnechatToolEvent[] = [];

    const params: ScopedRunnerRunToolsParams = {
      toolId: 'test-tool',
      toolParams: {
        foo: 'bar',
      },
      onEvent: (event) => {
        emittedEvents.push(event);
      },
    };

    tool.handler.mockImplementation((toolParams, { events }) => {
      events.reportProgress('some progress');
      return { results: [{ type: ToolResultType.other, data: { foo: 'bar' } }] };
    });

    await runTool({
      toolExecutionParams: params,
      parentManager: runnerManager,
    });

    expect(emittedEvents).toHaveLength(1);
    expect(emittedEvents[0]).toEqual({
      type: 'tool_progress',
      data: {
        message: 'some progress',
      },
    });
  });
});
