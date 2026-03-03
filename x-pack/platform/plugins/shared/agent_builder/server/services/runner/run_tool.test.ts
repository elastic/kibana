/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type {
  ScopedRunnerRunToolsParams,
  AgentBuilderToolEvent,
  ToolHandlerFn,
  HooksServiceStart,
} from '@kbn/agent-builder-server';
import type { ScopedRunnerRunInternalToolParams } from '@kbn/agent-builder-server/runner';
import { getToolResultId } from '@kbn/agent-builder-server/tools/utils';
import { ConfirmationStatus, AgentPromptType } from '@kbn/agent-builder-common/agents/prompts';
import type { CreateScopedRunnerDepsMock, MockedTool, ToolRegistryMock } from '../../test_utils';
import {
  createScopedRunnerDepsMock,
  createMockedTool,
  createToolRegistryMock,
} from '../../test_utils';
import type { AnalyticsService } from '../../telemetry';
import { RunnerManager } from './runner';
import { forkContextForAgentRun } from './utils';
import { runTool, runInternalTool } from './run_tool';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { HookLifecycle } from '@kbn/agent-builder-common';

jest.mock('@kbn/agent-builder-server/tools/utils', () => ({
  ...jest.requireActual('@kbn/agent-builder-server/tools/utils'),
  getToolResultId: jest.fn(),
}));

const getToolResultIdMock = getToolResultId as jest.MockedFn<typeof getToolResultId>;

describe('runTool', () => {
  let runnerDeps: CreateScopedRunnerDepsMock;
  let runnerManager: RunnerManager;
  let registry: ToolRegistryMock;
  let tool: MockedTool;
  let toolHandler: jest.MockedFunction<ToolHandlerFn>;
  let hooksRunMock: jest.MockedFunction<HooksServiceStart['run']>;

  beforeEach(() => {
    runnerDeps = createScopedRunnerDepsMock();
    runnerManager = new RunnerManager(runnerDeps);
    hooksRunMock = runnerDeps.hooks.run as jest.MockedFunction<HooksServiceStart['run']>;

    getToolResultIdMock.mockReturnValue('some-result-id');

    registry = createToolRegistryMock();
    const {
      toolsService: { getRegistry },
    } = runnerDeps;
    getRegistry.mockResolvedValue(registry);

    toolHandler = jest.fn().mockReturnValue({ results: [] });

    tool = createMockedTool({});
    tool.getSchema.mockReturnValue(
      z.object({
        foo: z.string(),
      })
    );
    tool.getHandler.mockReturnValue(toolHandler);
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
    tool.getSchema.mockReturnValue(
      z.object({
        bar: z.string(),
      })
    );

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

    expect(toolHandler).toHaveBeenCalledTimes(1);
    expect(toolHandler).toHaveBeenCalledWith(params.toolParams, expect.any(Object));
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

    expect(toolHandler).toHaveBeenCalledTimes(1);
    expect(toolHandler).toHaveBeenCalledWith({ foo: 'bar' }, expect.any(Object));
  });

  it('returns the expected value', async () => {
    const params: ScopedRunnerRunToolsParams = {
      toolId: 'test-tool',
      toolParams: {
        foo: 'bar',
      },
    };

    toolHandler.mockReturnValue({
      results: [{ type: ToolResultType.other, data: { test: true, over: 9000 } }],
    });

    const results = await runTool({
      toolExecutionParams: params,
      parentManager: runnerManager,
    });

    expect(results).toEqual({
      results: [
        {
          tool_result_id: 'some-result-id',
          type: ToolResultType.other,
          data: { test: true, over: 9000 },
        },
      ],
    });
  });

  it('exposes a context with the expected shape to the tool handler', async () => {
    const params: ScopedRunnerRunToolsParams = {
      toolId: 'test-tool',
      toolParams: {
        foo: 'bar',
      },
    };

    toolHandler.mockImplementation(() => {
      return { results: [{ type: ToolResultType.other, data: { value: 42 } }] };
    });

    await runTool({
      toolExecutionParams: params,
      parentManager: runnerManager,
    });

    expect(toolHandler).toHaveBeenCalledTimes(1);
    const context = toolHandler.mock.lastCall![1];

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
    const emittedEvents: AgentBuilderToolEvent[] = [];

    const params: ScopedRunnerRunToolsParams = {
      toolId: 'test-tool',
      toolParams: {
        foo: 'bar',
      },
      onEvent: (event) => {
        emittedEvents.push(event);
      },
    };

    toolHandler.mockImplementation((toolParams, { events }) => {
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

  it('when hooks are present: beforeToolCall is called and updated toolParams are passed to the tool handler', async () => {
    hooksRunMock.mockImplementation(async (lifecycle, context) =>
      lifecycle === HookLifecycle.beforeToolCall
        ? { ...context, toolParams: { foo: 'from-beforeToolCall-hook' } }
        : context
    );

    const params: ScopedRunnerRunToolsParams = {
      toolId: 'test-tool',
      toolParams: { foo: 'bar' },
    };

    await runTool({
      toolExecutionParams: params,
      parentManager: runnerManager,
    });

    expect(hooksRunMock).toHaveBeenCalledWith(
      HookLifecycle.beforeToolCall,
      expect.objectContaining({
        toolId: 'test-tool',
        toolParams: { foo: 'bar' },
        source: 'unknown',
      })
    );
    expect(toolHandler).toHaveBeenCalledWith(
      { foo: 'from-beforeToolCall-hook' },
      expect.any(Object)
    );
  });

  it('when hooks are present: afterToolCall is called and its return is used as the result', async () => {
    const modifiedToolReturn = {
      results: [
        {
          tool_result_id: 'some-result-id',
          type: ToolResultType.other,
          data: { from: 'afterToolCall-hook' },
        },
      ],
    };
    hooksRunMock.mockImplementation(async (lifecycle, context) =>
      lifecycle === HookLifecycle.afterToolCall
        ? { ...context, toolReturn: modifiedToolReturn }
        : context
    );

    const params: ScopedRunnerRunToolsParams = {
      toolId: 'test-tool',
      toolParams: { foo: 'bar' },
    };

    toolHandler.mockReturnValue({
      results: [{ type: ToolResultType.other, data: { original: true } }],
    });

    const results = await runTool({
      toolExecutionParams: params,
      parentManager: runnerManager,
    });

    expect(results).toEqual(modifiedToolReturn);
    expect(hooksRunMock).toHaveBeenCalledWith(
      HookLifecycle.afterToolCall,
      expect.objectContaining({
        toolId: 'test-tool',
        toolReturn: expect.objectContaining({
          results: expect.arrayContaining([expect.objectContaining({ data: { original: true } })]),
        }),
        toolHandlerContext: expect.any(Object),
      })
    );
  });
});

describe('runInternalTool - confirmation policy', () => {
  let runnerDeps: CreateScopedRunnerDepsMock;
  let runnerManager: RunnerManager;
  let tool: MockedTool;
  let toolHandler: jest.MockedFunction<ToolHandlerFn>;

  beforeEach(() => {
    runnerDeps = createScopedRunnerDepsMock();
    runnerManager = new RunnerManager(runnerDeps);

    (getToolResultId as jest.Mock).mockReturnValue('some-result-id');

    toolHandler = jest.fn().mockReturnValue({ results: [] });

    tool = createMockedTool({});
    tool.getSchema.mockReturnValue(
      z.object({
        foo: z.string(),
      })
    );
    tool.getHandler.mockReturnValue(toolHandler);
  });

  describe('when source is "agent"', () => {
    it('should prompt user when confirmation.askUser is "once" and unprompted', async () => {
      tool.confirmation = { askUser: 'once' };
      runnerDeps.promptManager.getConfirmationStatus.mockReturnValue({
        status: ConfirmationStatus.unprompted,
      });

      const params: ScopedRunnerRunInternalToolParams = {
        tool,
        toolParams: { foo: 'bar' },
        toolCallId: 'call-123',
        source: 'agent',
      };

      const result = await runInternalTool({
        toolExecutionParams: params,
        parentManager: runnerManager,
      });

      expect(result).toHaveProperty('prompt');
      expect(result.prompt).toEqual(
        expect.objectContaining({
          type: AgentPromptType.confirmation,
          id: 'tools.test-tool.confirmation',
        })
      );
      expect(toolHandler).not.toHaveBeenCalled();
    });

    it('should prompt user when confirmation.askUser is "always" and unprompted', async () => {
      tool.confirmation = { askUser: 'always' };
      runnerDeps.promptManager.getConfirmationStatus.mockReturnValue({
        status: ConfirmationStatus.unprompted,
      });

      const params: ScopedRunnerRunInternalToolParams = {
        tool,
        toolParams: { foo: 'bar' },
        toolCallId: 'call-456',
        source: 'agent',
      };

      const result = await runInternalTool({
        toolExecutionParams: params,
        parentManager: runnerManager,
      });

      expect(result).toHaveProperty('prompt');
      expect(result.prompt).toEqual(
        expect.objectContaining({
          type: AgentPromptType.confirmation,
          id: 'tools.test-tool.confirmation.call-456',
        })
      );
      expect(toolHandler).not.toHaveBeenCalled();
    });

    it('should execute tool when confirmation status is accepted', async () => {
      tool.confirmation = { askUser: 'once' };
      runnerDeps.promptManager.getConfirmationStatus.mockReturnValue({
        status: ConfirmationStatus.accepted,
      });

      const params: ScopedRunnerRunInternalToolParams = {
        tool,
        toolParams: { foo: 'bar' },
        toolCallId: 'call-123',
        source: 'agent',
      };

      await runInternalTool({
        toolExecutionParams: params,
        parentManager: runnerManager,
      });

      expect(toolHandler).toHaveBeenCalledTimes(1);
    });

    it('should return error when confirmation status is rejected', async () => {
      tool.confirmation = { askUser: 'once' };
      runnerDeps.promptManager.getConfirmationStatus.mockReturnValue({
        status: ConfirmationStatus.rejected,
      });

      const params: ScopedRunnerRunInternalToolParams = {
        tool,
        toolParams: { foo: 'bar' },
        toolCallId: 'call-123',
        source: 'agent',
      };

      const result = await runInternalTool({
        toolExecutionParams: params,
        parentManager: runnerManager,
      });

      expect(result).toHaveProperty('results');
      expect(result.results).toHaveLength(1);
      expect(result.results![0]).toEqual(
        expect.objectContaining({
          type: ToolResultType.error,
        })
      );
      expect(toolHandler).not.toHaveBeenCalled();
    });

    it('should skip confirmation when confirmation.askUser is "never"', async () => {
      tool.confirmation = { askUser: 'never' };

      const params: ScopedRunnerRunInternalToolParams = {
        tool,
        toolParams: { foo: 'bar' },
        toolCallId: 'call-123',
        source: 'agent',
      };

      await runInternalTool({
        toolExecutionParams: params,
        parentManager: runnerManager,
      });

      expect(runnerDeps.promptManager.getConfirmationStatus).not.toHaveBeenCalled();
      expect(toolHandler).toHaveBeenCalledTimes(1);
    });

    it('should skip confirmation when confirmation is undefined', async () => {
      tool.confirmation = undefined;

      const params: ScopedRunnerRunInternalToolParams = {
        tool,
        toolParams: { foo: 'bar' },
        toolCallId: 'call-123',
        source: 'agent',
      };

      await runInternalTool({
        toolExecutionParams: params,
        parentManager: runnerManager,
      });

      expect(runnerDeps.promptManager.getConfirmationStatus).not.toHaveBeenCalled();
      expect(toolHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('when source is not "agent"', () => {
    it('should skip confirmation regardless of policy', async () => {
      tool.confirmation = { askUser: 'always' };

      const params: ScopedRunnerRunInternalToolParams = {
        tool,
        toolParams: { foo: 'bar' },
        toolCallId: 'call-123',
        source: 'user',
      };

      await runInternalTool({
        toolExecutionParams: params,
        parentManager: runnerManager,
      });

      expect(runnerDeps.promptManager.getConfirmationStatus).not.toHaveBeenCalled();
      expect(toolHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('"once" vs "always" mode', () => {
    it('should use the same confirmation ID for multiple calls in "once" mode', async () => {
      tool.confirmation = { askUser: 'once' };
      runnerDeps.promptManager.getConfirmationStatus.mockReturnValue({
        status: ConfirmationStatus.unprompted,
      });

      const params1: ScopedRunnerRunInternalToolParams = {
        tool,
        toolParams: { foo: 'bar' },
        toolCallId: 'call-1',
        source: 'agent',
      };

      const params2: ScopedRunnerRunInternalToolParams = {
        tool,
        toolParams: { foo: 'baz' },
        toolCallId: 'call-2',
        source: 'agent',
      };

      const result1 = await runInternalTool({
        toolExecutionParams: params1,
        parentManager: runnerManager,
      });

      const result2 = await runInternalTool({
        toolExecutionParams: params2,
        parentManager: runnerManager,
      });

      // Both should have the same confirmation ID (base ID without toolCallId)
      expect(result1.prompt?.id).toBe('tools.test-tool.confirmation');
      expect(result2.prompt?.id).toBe('tools.test-tool.confirmation');
    });

    it('should use different confirmation IDs for multiple calls in "always" mode', async () => {
      tool.confirmation = { askUser: 'always' };
      runnerDeps.promptManager.getConfirmationStatus.mockReturnValue({
        status: ConfirmationStatus.unprompted,
      });

      const params1: ScopedRunnerRunInternalToolParams = {
        tool,
        toolParams: { foo: 'bar' },
        toolCallId: 'call-1',
        source: 'agent',
      };

      const params2: ScopedRunnerRunInternalToolParams = {
        tool,
        toolParams: { foo: 'baz' },
        toolCallId: 'call-2',
        source: 'agent',
      };

      const result1 = await runInternalTool({
        toolExecutionParams: params1,
        parentManager: runnerManager,
      });

      const result2 = await runInternalTool({
        toolExecutionParams: params2,
        parentManager: runnerManager,
      });

      // Each should have a different confirmation ID (includes toolCallId)
      expect(result1.prompt?.id).toBe('tools.test-tool.confirmation.call-1');
      expect(result2.prompt?.id).toBe('tools.test-tool.confirmation.call-2');
    });
  });
});

describe('runInternalTool - telemetry', () => {
  let runnerDeps: CreateScopedRunnerDepsMock;
  let runnerManager: RunnerManager;
  let tool: MockedTool;
  let toolHandler: jest.MockedFunction<ToolHandlerFn>;
  let analyticsService: jest.Mocked<
    Pick<AnalyticsService, 'reportToolCallSuccess' | 'reportToolCallError'>
  >;

  beforeEach(() => {
    runnerDeps = createScopedRunnerDepsMock();

    analyticsService = {
      reportToolCallSuccess: jest.fn(),
      reportToolCallError: jest.fn(),
    };
    (runnerDeps as any).analyticsService = analyticsService;

    runnerManager = new RunnerManager(runnerDeps);

    (getToolResultId as jest.Mock).mockReturnValue('some-result-id');

    toolHandler = jest.fn().mockReturnValue({
      results: [{ type: ToolResultType.other, data: { value: 42 } }],
    });

    tool = createMockedTool({});
    tool.getSchema.mockReturnValue(z.object({ foo: z.string() }));
    tool.getHandler.mockReturnValue(toolHandler);
  });

  it('reports a success event for a standard tool return', async () => {
    toolHandler.mockReturnValue({
      results: [
        { type: ToolResultType.other, data: { hello: true } },
        { type: ToolResultType.other, data: { foo: 'bar' } },
      ],
    });

    await runInternalTool({
      toolExecutionParams: {
        tool,
        toolParams: { foo: 'bar' },
        toolCallId: 'call-1',
        source: 'agent',
      },
      parentManager: runnerManager,
    });

    expect(analyticsService.reportToolCallSuccess).toHaveBeenCalledTimes(1);
    expect(analyticsService.reportToolCallSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        toolId: tool.id,
        toolCallId: 'call-1',
        source: 'agent',
        resultTypes: [ToolResultType.other, ToolResultType.other],
        duration: expect.any(Number),
      })
    );
    expect(analyticsService.reportToolCallError).not.toHaveBeenCalled();
  });

  it('reports an error event when all results are of type error', async () => {
    toolHandler.mockReturnValue({
      results: [
        { type: ToolResultType.error, data: { message: 'something went wrong' } },
        { type: ToolResultType.error, data: { message: 'another error' } },
      ],
    });

    await runInternalTool({
      toolExecutionParams: {
        tool,
        toolParams: { foo: 'bar' },
        toolCallId: 'call-2',
        source: 'agent',
      },
      parentManager: runnerManager,
    });

    expect(analyticsService.reportToolCallError).toHaveBeenCalledTimes(1);
    expect(analyticsService.reportToolCallError).toHaveBeenCalledWith(
      expect.objectContaining({
        toolId: tool.id,
        toolCallId: 'call-2',
        source: 'agent',
        errorType: 'tool_error',
        errorMessage: 'something went wrong',
        duration: expect.any(Number),
      })
    );
    expect(analyticsService.reportToolCallSuccess).not.toHaveBeenCalled();
  });

  it('reports a success event when only some results are errors', async () => {
    toolHandler.mockReturnValue({
      results: [
        { type: ToolResultType.error, data: { message: 'partial error' } },
        { type: ToolResultType.other, data: { ok: true } },
      ],
    });

    await runInternalTool({
      toolExecutionParams: {
        tool,
        toolParams: { foo: 'bar' },
        toolCallId: 'call-3',
        source: 'agent',
      },
      parentManager: runnerManager,
    });

    expect(analyticsService.reportToolCallSuccess).toHaveBeenCalledTimes(1);
    expect(analyticsService.reportToolCallSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        resultTypes: [ToolResultType.error, ToolResultType.other],
      })
    );
    expect(analyticsService.reportToolCallError).not.toHaveBeenCalled();
    expect(analyticsService.reportToolCallError).not.toHaveBeenCalled();
  });

  it('does not report telemetry for HITL (prompt) returns', async () => {
    toolHandler.mockReturnValue({
      prompt: {
        type: AgentPromptType.confirmation,
        id: 'some-prompt-id',
        message: 'please confirm',
      },
    });

    await runInternalTool({
      toolExecutionParams: {
        tool,
        toolParams: { foo: 'bar' },
        toolCallId: 'call-4',
        source: 'agent',
      },
      parentManager: runnerManager,
    });

    expect(analyticsService.reportToolCallSuccess).not.toHaveBeenCalled();
    expect(analyticsService.reportToolCallError).not.toHaveBeenCalled();
  });

  it('does not report telemetry when analyticsService is not available', async () => {
    (runnerDeps as any).analyticsService = undefined;
    const manager = new RunnerManager(runnerDeps);

    await runInternalTool({
      toolExecutionParams: {
        tool,
        toolParams: { foo: 'bar' },
        toolCallId: 'call-5',
        source: 'agent',
      },
      parentManager: manager,
    });

    expect(analyticsService.reportToolCallSuccess).not.toHaveBeenCalled();
    expect(analyticsService.reportToolCallError).not.toHaveBeenCalled();
  });

  it('extracts agentId from the run context stack', async () => {
    const contextWithAgent = forkContextForAgentRun({
      agentId: 'my-custom-agent',
      parentContext: runnerManager.context,
    });
    const managerWithAgent = new RunnerManager(runnerDeps, contextWithAgent);

    await runInternalTool({
      toolExecutionParams: {
        tool,
        toolParams: { foo: 'bar' },
        toolCallId: 'call-6',
        source: 'agent',
      },
      parentManager: managerWithAgent,
    });

    expect(analyticsService.reportToolCallSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: 'my-custom-agent',
      })
    );
  });

  it('passes undefined agentId when no agent is in the context stack', async () => {
    await runInternalTool({
      toolExecutionParams: {
        tool,
        toolParams: { foo: 'bar' },
        toolCallId: 'call-7',
        source: 'user',
      },
      parentManager: runnerManager,
    });

    expect(analyticsService.reportToolCallSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: undefined,
      })
    );
  });

  it('reports an error event when the tool handler throws', async () => {
    toolHandler.mockImplementation(() => {
      throw new Error('handler exploded');
    });

    await runInternalTool({
      toolExecutionParams: {
        tool,
        toolParams: { foo: 'bar' },
        toolCallId: 'call-8',
        source: 'agent',
      },
      parentManager: runnerManager,
    });

    expect(analyticsService.reportToolCallError).toHaveBeenCalledTimes(1);
    expect(analyticsService.reportToolCallError).toHaveBeenCalledWith(
      expect.objectContaining({
        toolId: tool.id,
        toolCallId: 'call-8',
        source: 'agent',
        errorType: 'tool_error',
        errorMessage: 'handler exploded',
        duration: expect.any(Number),
      })
    );
    expect(analyticsService.reportToolCallSuccess).not.toHaveBeenCalled();
  });

  it('does not let telemetry failure affect tool execution and logs a warning', async () => {
    analyticsService.reportToolCallSuccess.mockImplementation(() => {
      throw new Error('telemetry boom');
    });

    const result = await runInternalTool({
      toolExecutionParams: {
        tool,
        toolParams: { foo: 'bar' },
        toolCallId: 'call-9',
        source: 'agent',
      },
      parentManager: runnerManager,
    });

    expect(result).toHaveProperty('results');
    expect(result.results).toHaveLength(1);
    expect(runnerDeps.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to report tool call telemetry')
    );
  });

  it('includes the duration in the telemetry event', async () => {
    await runInternalTool({
      toolExecutionParams: {
        tool,
        toolParams: { foo: 'bar' },
        toolCallId: 'call-10',
        source: 'agent',
      },
      parentManager: runnerManager,
    });

    const { duration } = analyticsService.reportToolCallSuccess.mock.calls[0][0];
    expect(typeof duration).toBe('number');
    expect(duration).toBeGreaterThanOrEqual(0);
  });
});
