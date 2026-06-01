/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentPromptType } from '@kbn/agent-builder-common/agents/prompts';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { ToolHandlerResultsWithPromptReturn } from '@kbn/agent-builder-server/tools';
import { buildCombinedResultsPromptReturn } from '.';

const makeToolReturn = (
  overrides?: Partial<ToolHandlerResultsWithPromptReturn>
): ToolHandlerResultsWithPromptReturn => ({
  prompt: {
    type: AgentPromptType.confirmation,
    id: 'test-prompt-id',
  },
  results: [{ type: ToolResultType.other, data: { value: 42 } }],
  ...overrides,
});

describe('buildCombinedResultsPromptReturn', () => {
  it('returns a canned error result when isStandaloneExecution is true', () => {
    const reportToolCallTelemetry = jest.fn();

    const result = buildCombinedResultsPromptReturn({
      getToolResultId: () => 'generated-id',
      isStandaloneExecution: true,
      reportToolCallTelemetry,
      toolReturn: makeToolReturn(),
    });

    expect(result).toEqual({
      results: [
        expect.objectContaining({
          type: ToolResultType.error,
          data: expect.objectContaining({
            message: expect.stringContaining('non-interactive mode'),
          }),
        }),
      ],
    });
    expect(result.prompt).toBeUndefined();
  });

  it('does not call reportToolCallTelemetry when isStandaloneExecution is true', () => {
    const reportToolCallTelemetry = jest.fn();

    buildCombinedResultsPromptReturn({
      getToolResultId: () => 'generated-id',
      isStandaloneExecution: true,
      reportToolCallTelemetry,
      toolReturn: makeToolReturn(),
    });

    expect(reportToolCallTelemetry).not.toHaveBeenCalled();
  });

  it('assigns generated ids to results that lack tool_result_id when non-standalone', () => {
    let counter = 0;
    const getToolResultId = jest.fn(() => `id-${++counter}`);

    const toolReturn = makeToolReturn({
      results: [
        { type: ToolResultType.other, data: { a: 1 } },
        { type: ToolResultType.other, data: { b: 2 } },
      ],
    });

    const result = buildCombinedResultsPromptReturn({
      getToolResultId,
      isStandaloneExecution: false,
      toolReturn,
    });

    expect(result.results).toEqual([
      expect.objectContaining({ tool_result_id: 'id-1', data: { a: 1 } }),
      expect.objectContaining({ tool_result_id: 'id-2', data: { b: 2 } }),
    ]);
    expect(getToolResultId).toHaveBeenCalledTimes(2);
  });

  it('preserves existing tool_result_id and does not overwrite it when non-standalone', () => {
    const getToolResultId = jest.fn(() => 'generated-id');

    const toolReturn = makeToolReturn({
      results: [{ type: ToolResultType.other, data: { val: 99 }, tool_result_id: 'pre-set-id' }],
    });

    const result = buildCombinedResultsPromptReturn({
      getToolResultId,
      isStandaloneExecution: false,
      toolReturn,
    });

    expect(result.results![0].tool_result_id).toBe('pre-set-id');
    expect(getToolResultId).not.toHaveBeenCalled();
  });

  it('returns both prompt and results when non-standalone', () => {
    const toolReturn = makeToolReturn();

    const result = buildCombinedResultsPromptReturn({
      getToolResultId: () => 'some-id',
      isStandaloneExecution: false,
      toolReturn,
    });

    expect(result.prompt).toEqual(toolReturn.prompt);
    expect(result.results).toHaveLength(1);
    expect(result.results![0]).toMatchObject({ data: { value: 42 }, tool_result_id: 'some-id' });
  });

  it('calls reportToolCallTelemetry with the results-with-ids when non-standalone', () => {
    const reportToolCallTelemetry = jest.fn();
    const toolReturn = makeToolReturn({
      results: [{ type: ToolResultType.other, data: { x: 1 } }],
    });

    buildCombinedResultsPromptReturn({
      getToolResultId: () => 'tel-id',
      isStandaloneExecution: false,
      reportToolCallTelemetry,
      toolReturn,
    });

    expect(reportToolCallTelemetry).toHaveBeenCalledTimes(1);
    expect(reportToolCallTelemetry).toHaveBeenCalledWith([
      expect.objectContaining({ tool_result_id: 'tel-id', data: { x: 1 } }),
    ]);
  });

  it('does not throw when reportToolCallTelemetry is not provided', () => {
    const toolReturn = makeToolReturn();

    expect(() =>
      buildCombinedResultsPromptReturn({
        getToolResultId: () => 'id',
        isStandaloneExecution: false,
        toolReturn,
      })
    ).not.toThrow();
  });
});
