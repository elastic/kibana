/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { AgentPromptType } from '@kbn/agent-builder-common/agents/prompts';
import { resumeInnerAgent } from '.';
import { handleFormPromptResponse } from '../../../services/execution/runner/utils/handle_form_prompt';
import { resumeInnerWorkflow } from '../resume_inner_workflow';
import { runInnerAgent } from '../run_inner_agent';

jest.mock('../../../services/execution/runner/utils/handle_form_prompt');
jest.mock('../resume_inner_workflow');
jest.mock('../run_inner_agent');

const mockHandleFormPromptResponse = handleFormPromptResponse as jest.MockedFunction<
  typeof handleFormPromptResponse
>;
const mockResumeInnerWorkflow = resumeInnerWorkflow as jest.MockedFunction<
  typeof resumeInnerWorkflow
>;
const mockRunInnerAgent = runInnerAgent as jest.Mock;

describe('resumeInnerAgent', () => {
  const request = { headers: {} } as unknown as KibanaRequest;
  const abortSignal = new AbortController().signal;
  const executionService = {} as any;
  const workflowApi = { resumeWorkflowExecution: jest.fn() } as any;

  const makeRound = (structuredOutput: unknown) => ({
    id: 'r-1',
    response: { message: 'ok', structured_output: structuredOutput },
  });

  const makePendingPrompt = (overrides: Record<string, unknown> = {}) => ({
    type: AgentPromptType.form,
    id: 'inner-step-exec-1',
    execution_id: 'inner-exec-1',
    step_execution_id: 'inner-step-exec-1',
    message: 'approve?',
    schema: { type: 'object' },
    resume_seq: 3,
    ...overrides,
  });

  const makeConversationClient = (pendingPrompts: unknown[]) =>
    ({
      get: jest.fn().mockResolvedValue({
        rounds: [{ pending_prompts: pendingPrompts }],
      }),
    } as any);

  const baseParams = {
    abortSignal,
    agentId: 'default',
    connectorId: 'connector-1',
    conversationIdFromInput: undefined as string | undefined,
    createConversation: true as boolean | undefined,
    executionService,
    logger: undefined,
    nextInput: { message: 'Use the tool' },
    request,
    resumeInput: { approved: true },
    schema: undefined as Record<string, unknown> | undefined,
    spaceId: 'default',
    stepState: { conversationId: 'c-saved', innerExecutionId: 'inner-exec-1' },
    workflowApi,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('proper resume path (inner conversation has a pending form prompt)', () => {
    beforeEach(() => {
      mockHandleFormPromptResponse.mockResolvedValue({
        kind: 'resumed',
        observedExecution: { execution_id: 'inner-exec-1', status: 'completed' } as any,
        observedStatus: 'completed',
      });
      mockRunInnerAgent.mockResolvedValue({
        outputConversationId: 'c-saved',
        outputMessage: 'done',
        round: makeRound(null),
      });
    });

    it('answers the inner pending form prompt via handleFormPromptResponse', async () => {
      const conversationClient = makeConversationClient([makePendingPrompt()]);

      await resumeInnerAgent({ ...baseParams, conversationClient });

      expect(mockHandleFormPromptResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: 'c-saved',
          formPromptResponse: {
            execution_id: 'inner-exec-1',
            id: 'inner-step-exec-1',
            values: { approved: true },
            expected_resume_seq: 4,
          },
        })
      );
    });

    it('does NOT resume the inner workflow directly (handleFormPromptResponse owns the resume)', async () => {
      const conversationClient = makeConversationClient([makePendingPrompt()]);

      await resumeInnerAgent({ ...baseParams, conversationClient });

      expect(mockResumeInnerWorkflow).not.toHaveBeenCalled();
    });

    it('re-runs the inner agent as a pure form submission (form_prompts, no message)', async () => {
      const conversationClient = makeConversationClient([makePendingPrompt()]);

      await resumeInnerAgent({ ...baseParams, conversationClient });

      expect(mockRunInnerAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            conversationId: 'c-saved',
            nextInput: {
              form_prompts: [
                {
                  execution_id: 'inner-exec-1',
                  id: 'inner-step-exec-1',
                  values: { approved: true },
                  expected_resume_seq: 4,
                },
              ],
            },
          }),
        })
      );
    });

    it('threads the resumed execution state so the stale workflow tool result is refreshed', async () => {
      const conversationClient = makeConversationClient([makePendingPrompt()]);

      await resumeInnerAgent({ ...baseParams, conversationClient });

      expect(mockRunInnerAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            resumedStates: [
              {
                execution_id: 'inner-exec-1',
                observedExecution: { execution_id: 'inner-exec-1', status: 'completed' },
                observedStatus: 'completed',
              },
            ],
          }),
        })
      );
    });

    it('returns the inner agent output message', async () => {
      const conversationClient = makeConversationClient([makePendingPrompt()]);

      const result = await resumeInnerAgent({ ...baseParams, conversationClient });

      expect(result.output.message).toBe('done');
    });

    it('omits expected_resume_seq when the pending prompt has no resume_seq', async () => {
      const conversationClient = makeConversationClient([
        makePendingPrompt({ resume_seq: undefined }),
      ]);

      await resumeInnerAgent({ ...baseParams, conversationClient });

      expect(mockHandleFormPromptResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          formPromptResponse: {
            execution_id: 'inner-exec-1',
            id: 'inner-step-exec-1',
            values: { approved: true },
          },
        })
      );
    });
  });

  describe('fallback path (no stored inner conversation / pending prompt)', () => {
    beforeEach(() => {
      mockResumeInnerWorkflow.mockResolvedValue({ savedConversationId: 'c-saved' });
      mockRunInnerAgent.mockResolvedValue({
        outputConversationId: 'c-saved',
        outputMessage: 'fallback done',
        round: makeRound(null),
      });
    });

    it('resumes the inner workflow directly when no conversationClient is available', async () => {
      await resumeInnerAgent({ ...baseParams, conversationClient: undefined });

      expect(mockResumeInnerWorkflow).toHaveBeenCalledTimes(1);
      expect(mockHandleFormPromptResponse).not.toHaveBeenCalled();
    });

    it('re-runs the inner agent with the original nextInput on the fallback path', async () => {
      await resumeInnerAgent({ ...baseParams, conversationClient: undefined });

      expect(mockRunInnerAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({ nextInput: { message: 'Use the tool' } }),
        })
      );
    });

    it('falls back when the inner conversation has no matching pending prompt', async () => {
      const conversationClient = makeConversationClient([]);

      await resumeInnerAgent({ ...baseParams, conversationClient });

      expect(mockResumeInnerWorkflow).toHaveBeenCalledTimes(1);
      expect(mockHandleFormPromptResponse).not.toHaveBeenCalled();
    });
  });
});
