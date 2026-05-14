/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { resumeInnerWorkflow } from '.';

describe('resumeInnerWorkflow', () => {
  const request = { headers: {} } as unknown as KibanaRequest;
  const spaceId = 'default';
  const resumeInput = { name: 'John' };

  it('skips resume and returns savedConversationId when workflowApi is undefined', async () => {
    const result = await resumeInnerWorkflow({
      request,
      resumeInput,
      spaceId,
      stepState: { conversationId: 'c-1', innerExecutionId: 'inner-1' },
      workflowApi: undefined,
    });

    expect(result.savedConversationId).toBe('c-1');
  });

  it('skips resume and returns savedConversationId when innerExecutionId is missing from stepState', async () => {
    const resumeWorkflowExecution = jest.fn().mockResolvedValue(undefined);
    const workflowApi = { resumeWorkflowExecution } as any;

    const result = await resumeInnerWorkflow({
      request,
      resumeInput,
      spaceId,
      stepState: { conversationId: 'c-1' },
      workflowApi,
    });

    expect(resumeWorkflowExecution).not.toHaveBeenCalled();
    expect(result.savedConversationId).toBe('c-1');
  });

  it('calls resumeWorkflowExecution with correct args when workflowApi and innerExecutionId are present', async () => {
    const resumeWorkflowExecution = jest.fn().mockResolvedValue(undefined);
    const workflowApi = { resumeWorkflowExecution } as any;

    await resumeInnerWorkflow({
      request,
      resumeInput,
      spaceId,
      stepState: { conversationId: 'c-1', innerExecutionId: 'inner-exec-id' },
      workflowApi,
    });

    expect(resumeWorkflowExecution).toHaveBeenCalledWith(
      'inner-exec-id',
      'default',
      resumeInput,
      request
    );
  });

  it('returns savedConversationId from stepState.conversationId', async () => {
    const resumeWorkflowExecution = jest.fn().mockResolvedValue(undefined);
    const workflowApi = { resumeWorkflowExecution } as any;

    const result = await resumeInnerWorkflow({
      request,
      resumeInput,
      spaceId,
      stepState: { conversationId: 'c-saved', innerExecutionId: 'inner-exec-id' },
      workflowApi,
    });

    expect(result.savedConversationId).toBe('c-saved');
  });

  it('returns undefined savedConversationId when stepState has no conversationId', async () => {
    const result = await resumeInnerWorkflow({
      request,
      resumeInput,
      spaceId,
      stepState: {},
      workflowApi: undefined,
    });

    expect(result.savedConversationId).toBeUndefined();
  });

  it('passes expectedResumeSeq to resumeWorkflowExecution when innerResumeSeq is in stepState', async () => {
    const resumeWorkflowExecution = jest.fn().mockResolvedValue(undefined);
    const workflowApi = { resumeWorkflowExecution } as any;

    await resumeInnerWorkflow({
      request,
      resumeInput,
      spaceId,
      stepState: { conversationId: 'c-1', innerExecutionId: 'inner-exec-id', innerResumeSeq: 2 },
      workflowApi,
    });

    expect(resumeWorkflowExecution).toHaveBeenCalledWith(
      'inner-exec-id',
      'default',
      resumeInput,
      request,
      { expectedResumeSeq: 3 }
    );
  });
});
