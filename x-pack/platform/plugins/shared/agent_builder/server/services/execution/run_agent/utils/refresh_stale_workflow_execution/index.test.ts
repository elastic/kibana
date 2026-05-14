/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationRoundStepType } from '@kbn/agent-builder-common';
import type { ToolCallStep } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { ToolResult } from '@kbn/agent-builder-common/tools/tool_result';
import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowExecutionState } from '@kbn/agent-builder-tools-base/workflows';
import type { ResumedFormPromptState } from '../../../runner/utils/resume_form_prompts';
import { refreshStaleWorkflowExecution } from '.';

const makeWorkflowExecution = (
  overrides: Partial<WorkflowExecutionState> = {}
): WorkflowExecutionState => ({
  execution_id: 'exec-1',
  started_at: '2026-01-01T00:00:00.000Z',
  status: ExecutionStatus.WAITING_FOR_INPUT,
  workflow_id: 'wf-1',
  workflow_name: 'Test Workflow',
  waiting_input: {
    message: 'Please fill in the form',
    schema: { type: 'object', properties: { approved: { type: 'boolean' } } },
    step_execution_id: 'step-exec-1',
  },
  ...overrides,
});

const makeWorkflowToolResult = (execution: WorkflowExecutionState): ToolResult => ({
  data: { execution },
  tool_result_id: 'result-1',
  type: ToolResultType.other,
});

const makeNonWorkflowToolResult = (): ToolResult => ({
  data: { some: 'data', value: 42 },
  tool_result_id: 'result-2',
  type: ToolResultType.other,
});

const makeToolCallStep = (results: ToolResult[]): ToolCallStep => ({
  params: { workflow_id: 'wf-1' },
  results,
  tool_call_id: 'call-1',
  tool_id: 'run_workflow',
  type: ConversationRoundStepType.toolCall,
});

const makeResumedState = (
  overrides: Partial<ResumedFormPromptState> = {}
): ResumedFormPromptState => ({
  execution_id: 'exec-1',
  observedExecution: null,
  observedStatus: ExecutionStatus.COMPLETED,
  ...overrides,
});

const makeLogger = () => ({
  debug: jest.fn(),
  error: jest.fn(),
});

describe('refreshStaleWorkflowExecution', () => {
  describe('I1: terminal observed status', () => {
    it('replaces execution with observedExecution when status is COMPLETED and observedExecution is non-null', () => {
      const completedExecution = makeWorkflowExecution({
        finished_at: '2026-01-01T00:01:00.000Z',
        status: ExecutionStatus.COMPLETED,
        waiting_input: undefined,
      });
      const step = makeToolCallStep([makeWorkflowToolResult(makeWorkflowExecution())]);
      const resumedStates: ResumedFormPromptState[] = [
        makeResumedState({
          observedExecution: completedExecution,
          observedStatus: ExecutionStatus.COMPLETED,
        }),
      ];

      const result = refreshStaleWorkflowExecution({
        logger: makeLogger() as any,
        resumedStates,
        step,
      });

      const resultExecution = (result.results[0].data as Record<string, unknown>)
        .execution as WorkflowExecutionState;
      expect(resultExecution.status).toBe(ExecutionStatus.COMPLETED);
      expect(resultExecution.finished_at).toBe('2026-01-01T00:01:00.000Z');
      expect(resultExecution.waiting_input).toBeUndefined();
    });

    it('replaces execution with observedExecution when status is FAILED and observedExecution is non-null', () => {
      const failedExecution = makeWorkflowExecution({
        error_message: 'Something went wrong',
        status: ExecutionStatus.FAILED,
        waiting_input: undefined,
      });
      const step = makeToolCallStep([makeWorkflowToolResult(makeWorkflowExecution())]);
      const resumedStates: ResumedFormPromptState[] = [
        makeResumedState({
          observedExecution: failedExecution,
          observedStatus: ExecutionStatus.FAILED,
        }),
      ];

      const result = refreshStaleWorkflowExecution({
        logger: makeLogger() as any,
        resumedStates,
        step,
      });

      const resultExecution = (result.results[0].data as Record<string, unknown>)
        .execution as WorkflowExecutionState;
      expect(resultExecution.status).toBe(ExecutionStatus.FAILED);
      expect(resultExecution.error_message).toBe('Something went wrong');
      expect(resultExecution.waiting_input).toBeUndefined();
    });

    it('constructs minimal fresh execution from current when observedExecution is null (stale terminal)', () => {
      const step = makeToolCallStep([makeWorkflowToolResult(makeWorkflowExecution())]);
      const resumedStates: ResumedFormPromptState[] = [
        makeResumedState({
          observedExecution: null,
          observedStatus: ExecutionStatus.COMPLETED,
        }),
      ];

      const result = refreshStaleWorkflowExecution({
        logger: makeLogger() as any,
        resumedStates,
        step,
      });

      const resultExecution = (result.results[0].data as Record<string, unknown>)
        .execution as WorkflowExecutionState;
      expect(resultExecution.status).toBe(ExecutionStatus.COMPLETED);
      expect(resultExecution.execution_id).toBe('exec-1');
      expect(resultExecution.workflow_id).toBe('wf-1');
      expect(resultExecution.waiting_input).toBeUndefined();
    });

    it('preserves non-execution fields in the result', () => {
      const resultWithExtra: ToolResult = {
        data: { execution: makeWorkflowExecution(), extra_field: 'preserved' },
        tool_result_id: 'result-1',
        type: ToolResultType.other,
      };
      const step = makeToolCallStep([resultWithExtra]);
      const resumedStates: ResumedFormPromptState[] = [
        makeResumedState({ observedStatus: ExecutionStatus.COMPLETED }),
      ];

      const result = refreshStaleWorkflowExecution({
        logger: makeLogger() as any,
        resumedStates,
        step,
      });

      const resultData = result.results[0].data as Record<string, unknown>;
      expect(resultData.extra_field).toBe('preserved');
      expect(resultData.execution).toBeDefined();
    });

    it('does not log an error when replacing a terminal execution', () => {
      const logger = makeLogger();
      const step = makeToolCallStep([makeWorkflowToolResult(makeWorkflowExecution())]);
      const resumedStates: ResumedFormPromptState[] = [
        makeResumedState({ observedStatus: ExecutionStatus.COMPLETED }),
      ];

      refreshStaleWorkflowExecution({ logger: logger as any, resumedStates, step });

      expect(logger.error).not.toHaveBeenCalled();
    });

    it('[log trace] emits [hitl-debug][ab] refresh.I1 marker', () => {
      const logger = makeLogger();
      const step = makeToolCallStep([makeWorkflowToolResult(makeWorkflowExecution())]);
      const resumedStates: ResumedFormPromptState[] = [
        makeResumedState({ observedStatus: ExecutionStatus.COMPLETED }),
      ];

      refreshStaleWorkflowExecution({ logger: logger as any, resumedStates, step });

      const msgs = logger.debug.mock.calls.map((c: unknown[]) =>
        typeof c[0] === 'function' ? (c[0] as () => string)() : String(c[0])
      );
      expect(msgs.some((m: string) => m.includes('[hitl-debug][ab] refresh.I1'))).toBe(true);
    });
  });

  describe('I2: still WAITING with different prompt.id', () => {
    it('replaces execution with observedExecution when step_execution_id differs', () => {
      const newExecution = makeWorkflowExecution({
        waiting_input: {
          message: 'New question',
          schema: {},
          step_execution_id: 'step-exec-NEW',
        },
      });
      const step = makeToolCallStep([makeWorkflowToolResult(makeWorkflowExecution())]);
      const resumedStates: ResumedFormPromptState[] = [
        makeResumedState({
          observedExecution: newExecution,
          observedStatus: ExecutionStatus.WAITING_FOR_INPUT,
        }),
      ];

      const result = refreshStaleWorkflowExecution({
        logger: makeLogger() as any,
        resumedStates,
        step,
      });

      const resultExecution = (result.results[0].data as Record<string, unknown>)
        .execution as WorkflowExecutionState;
      expect(resultExecution.status).toBe(ExecutionStatus.WAITING_FOR_INPUT);
      expect(resultExecution.waiting_input?.step_execution_id).toBe('step-exec-NEW');
    });

    it('constructs minimal fresh execution when observedExecution is null (stale workflow_advanced_to_new_prompt)', () => {
      const step = makeToolCallStep([makeWorkflowToolResult(makeWorkflowExecution())]);
      const resumedStates: ResumedFormPromptState[] = [
        makeResumedState({
          observedExecution: null,
          observedStatus: ExecutionStatus.WAITING_FOR_INPUT,
        }),
      ];

      const result = refreshStaleWorkflowExecution({
        logger: makeLogger() as any,
        resumedStates,
        step,
      });

      const resultExecution = (result.results[0].data as Record<string, unknown>)
        .execution as WorkflowExecutionState;
      expect(resultExecution.status).toBe(ExecutionStatus.WAITING_FOR_INPUT);
      expect(resultExecution.execution_id).toBe('exec-1');
      expect(resultExecution.waiting_input).toBeUndefined();
    });

    it('does not log an error when replacing with a different prompt', () => {
      const logger = makeLogger();
      const newExecution = makeWorkflowExecution({
        waiting_input: {
          message: 'New question',
          schema: {},
          step_execution_id: 'step-exec-NEW',
        },
      });
      const step = makeToolCallStep([makeWorkflowToolResult(makeWorkflowExecution())]);
      const resumedStates: ResumedFormPromptState[] = [
        makeResumedState({
          observedExecution: newExecution,
          observedStatus: ExecutionStatus.WAITING_FOR_INPUT,
        }),
      ];

      refreshStaleWorkflowExecution({ logger: logger as any, resumedStates, step });

      expect(logger.error).not.toHaveBeenCalled();
    });

    it('[log trace] emits [hitl-debug][ab] refresh.I2 marker with old and new stepId', () => {
      const logger = makeLogger();
      const newExecution = makeWorkflowExecution({
        waiting_input: {
          message: 'New question',
          schema: {},
          step_execution_id: 'step-exec-NEW',
        },
      });
      const step = makeToolCallStep([makeWorkflowToolResult(makeWorkflowExecution())]);
      const resumedStates: ResumedFormPromptState[] = [
        makeResumedState({
          observedExecution: newExecution,
          observedStatus: ExecutionStatus.WAITING_FOR_INPUT,
        }),
      ];

      refreshStaleWorkflowExecution({ logger: logger as any, resumedStates, step });

      const msgs = logger.debug.mock.calls.map((c: unknown[]) =>
        typeof c[0] === 'function' ? (c[0] as () => string)() : String(c[0])
      );
      expect(msgs.some((m: string) => m.includes('[hitl-debug][ab] refresh.I2'))).toBe(true);
      expect(msgs.some((m: string) => m.includes('oldStepId=step-exec-1'))).toBe(true);
      expect(msgs.some((m: string) => m.includes('newStepId=step-exec-NEW'))).toBe(true);
    });
  });

  describe('I3: still WAITING with SAME prompt.id (invariant violation)', () => {
    it('returns step as-is when step_execution_id is unchanged after resume', () => {
      const sameExecution = makeWorkflowExecution({
        waiting_input: {
          message: 'Still the same question',
          schema: {},
          step_execution_id: 'step-exec-1',
        },
      });
      const originalStep = makeToolCallStep([makeWorkflowToolResult(makeWorkflowExecution())]);
      const resumedStates: ResumedFormPromptState[] = [
        makeResumedState({
          observedExecution: sameExecution,
          observedStatus: ExecutionStatus.WAITING_FOR_INPUT,
        }),
      ];

      const result = refreshStaleWorkflowExecution({
        logger: makeLogger() as any,
        resumedStates,
        step: originalStep,
      });

      expect(result).toBe(originalStep);
    });

    it('calls logger.error when step_execution_id is unchanged after resume', () => {
      const logger = makeLogger();
      const sameExecution = makeWorkflowExecution({
        waiting_input: {
          message: 'Still the same question',
          schema: {},
          step_execution_id: 'step-exec-1',
        },
      });
      const step = makeToolCallStep([makeWorkflowToolResult(makeWorkflowExecution())]);
      const resumedStates: ResumedFormPromptState[] = [
        makeResumedState({
          observedExecution: sameExecution,
          observedStatus: ExecutionStatus.WAITING_FOR_INPUT,
        }),
      ];

      refreshStaleWorkflowExecution({ logger: logger as any, resumedStates, step });

      expect(logger.error).toHaveBeenCalled();
    });

    it('[log trace] emits [hitl-debug][ab] refresh.I3 marker when stepId is unchanged', () => {
      const logger = makeLogger();
      const sameExecution = makeWorkflowExecution({
        waiting_input: {
          message: 'Still the same question',
          schema: {},
          step_execution_id: 'step-exec-1',
        },
      });
      const step = makeToolCallStep([makeWorkflowToolResult(makeWorkflowExecution())]);
      const resumedStates: ResumedFormPromptState[] = [
        makeResumedState({
          observedExecution: sameExecution,
          observedStatus: ExecutionStatus.WAITING_FOR_INPUT,
        }),
      ];

      refreshStaleWorkflowExecution({ logger: logger as any, resumedStates, step });

      const msgs = logger.debug.mock.calls.map((c: unknown[]) =>
        typeof c[0] === 'function' ? (c[0] as () => string)() : String(c[0])
      );
      expect(msgs.some((m: string) => m.includes('[hitl-debug][ab] refresh.I3'))).toBe(true);
    });
  });

  describe('I4: non-workflow tool result', () => {
    it('passes through a step with no OtherResult containing an execution', () => {
      const step = makeToolCallStep([makeNonWorkflowToolResult()]);
      const resumedStates: ResumedFormPromptState[] = [
        makeResumedState({ observedStatus: ExecutionStatus.COMPLETED }),
      ];

      const result = refreshStaleWorkflowExecution({
        logger: makeLogger() as any,
        resumedStates,
        step,
      });

      expect(result).toBe(step);
    });

    it('passes through a step with a non-other result type', () => {
      const resourceResult: ToolResult = {
        data: { content: {}, reference: { id: 'r', index: 'i' } },
        tool_result_id: 'result-3',
        type: ToolResultType.resource,
      };
      const step = makeToolCallStep([resourceResult]);
      const resumedStates: ResumedFormPromptState[] = [
        makeResumedState({ observedStatus: ExecutionStatus.COMPLETED }),
      ];

      const result = refreshStaleWorkflowExecution({
        logger: makeLogger() as any,
        resumedStates,
        step,
      });

      expect(result).toBe(step);
    });

    it('passes through a step with empty results', () => {
      const step = makeToolCallStep([]);
      const resumedStates: ResumedFormPromptState[] = [
        makeResumedState({ observedStatus: ExecutionStatus.COMPLETED }),
      ];

      const result = refreshStaleWorkflowExecution({
        logger: makeLogger() as any,
        resumedStates,
        step,
      });

      expect(result).toBe(step);
    });
  });

  describe('I5: no match in resumedStates', () => {
    it('passes through when resumedStates is empty', () => {
      const step = makeToolCallStep([makeWorkflowToolResult(makeWorkflowExecution())]);

      const result = refreshStaleWorkflowExecution({
        logger: makeLogger() as any,
        resumedStates: [],
        step,
      });

      expect(result).toBe(step);
    });

    it('passes through when execution_id does not match any resumedState', () => {
      const step = makeToolCallStep([makeWorkflowToolResult(makeWorkflowExecution())]);
      const resumedStates: ResumedFormPromptState[] = [
        makeResumedState({ execution_id: 'exec-OTHER' }),
      ];

      const result = refreshStaleWorkflowExecution({
        logger: makeLogger() as any,
        resumedStates,
        step,
      });

      expect(result).toBe(step);
    });
  });

  describe('I-processing: non-terminal, non-WAITING_FOR_INPUT (poll timeout / S9)', () => {
    it('replaces execution stripping waiting_input when observedStatus is unknown and execution had waiting_input', () => {
      const step = makeToolCallStep([makeWorkflowToolResult(makeWorkflowExecution())]);
      const resumedStates: ResumedFormPromptState[] = [
        makeResumedState({
          observedExecution: null,
          observedStatus: 'unknown',
        }),
      ];

      const result = refreshStaleWorkflowExecution({
        logger: makeLogger() as any,
        resumedStates,
        step,
      });

      const resultExecution = (result.results[0].data as Record<string, unknown>)
        .execution as WorkflowExecutionState;
      expect(resultExecution.status).toBe('unknown');
      expect(resultExecution.waiting_input).toBeUndefined();
    });

    it('passes through when execution had no waiting_input (not a HITL step)', () => {
      const executionWithoutInput = makeWorkflowExecution({ waiting_input: undefined });
      const step = makeToolCallStep([makeWorkflowToolResult(executionWithoutInput)]);
      const resumedStates: ResumedFormPromptState[] = [
        makeResumedState({
          observedExecution: null,
          observedStatus: 'unknown',
        }),
      ];

      const result = refreshStaleWorkflowExecution({
        logger: makeLogger() as any,
        resumedStates,
        step,
      });

      expect(result).toBe(step);
    });

    it('[S9][log trace] emits [hitl-debug][ab] refresh.I-processing marker when stripping waiting_input', () => {
      const logger = makeLogger();
      const step = makeToolCallStep([makeWorkflowToolResult(makeWorkflowExecution())]);
      const resumedStates: ResumedFormPromptState[] = [
        makeResumedState({
          observedExecution: null,
          observedStatus: ExecutionStatus.RUNNING,
        }),
      ];

      refreshStaleWorkflowExecution({ logger: logger as any, resumedStates, step });

      const msgs = logger.debug.mock.calls.map((c: unknown[]) =>
        typeof c[0] === 'function' ? (c[0] as () => string)() : String(c[0])
      );
      expect(msgs.some((m: string) => m.includes('[hitl-debug][ab] refresh.I-processing'))).toBe(
        true
      );
      expect(msgs.some((m: string) => m.includes('stripping waiting_input'))).toBe(true);
    });
  });

  describe('multi-result steps', () => {
    it('only rewrites the workflow result and leaves other results unchanged', () => {
      const nonWorkflow = makeNonWorkflowToolResult();
      const workflowResult = makeWorkflowToolResult(makeWorkflowExecution());
      const step = makeToolCallStep([nonWorkflow, workflowResult]);
      const resumedStates: ResumedFormPromptState[] = [
        makeResumedState({ observedStatus: ExecutionStatus.COMPLETED }),
      ];

      const result = refreshStaleWorkflowExecution({
        logger: makeLogger() as any,
        resumedStates,
        step,
      });

      expect(result.results[0]).toBe(nonWorkflow);
      const resultExecution = (result.results[1].data as Record<string, unknown>)
        .execution as WorkflowExecutionState;
      expect(resultExecution.status).toBe(ExecutionStatus.COMPLETED);
    });
  });
});
