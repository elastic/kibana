/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import type { KibanaRequest } from '@kbn/core-http-server';
import { ChatEventType } from '@kbn/agent-builder-common';
import { runInnerAgent } from '.';

describe('runInnerAgent', () => {
  const request = { headers: {} } as unknown as KibanaRequest;
  const abortSignal = new AbortController().signal;

  const baseParams = {
    agentId: 'default',
    connectorId: 'connector-1',
    conversationId: undefined,
    autoCreateConversationWithId: undefined,
    storeConversation: false,
    structuredOutput: false,
    outputSchema: undefined,
    nextInput: { message: 'hello' },
  };

  const makeExecutionService = (events$: any) => ({
    executeAgent: jest.fn().mockResolvedValue({ executionId: 'exec-1', events$ }),
  });

  it('throws when no round_complete event is received', async () => {
    const events$ = of({
      type: ChatEventType.conversationCreated,
      data: { conversation_id: 'c-1', title: 't' },
    });

    const executionService = makeExecutionService(events$) as any;

    await expect(
      runInnerAgent({
        abortSignal,
        executionService,
        params: baseParams,
        request,
        schema: undefined,
        storeConversation: false,
      })
    ).rejects.toThrow('No round_complete event received from execution service');
  });

  it('throws when storeConversation is true but no conversation event is received', async () => {
    const events$ = of({
      type: ChatEventType.roundComplete,
      data: {
        round: {
          id: 'r-1',
          response: { message: 'ok', structured_output: null },
        },
      },
    });

    const executionService = makeExecutionService(events$) as any;

    await expect(
      runInnerAgent({
        abortSignal,
        executionService,
        params: { ...baseParams, storeConversation: true },
        request,
        schema: undefined,
        storeConversation: true,
      })
    ).rejects.toThrow('No conversation_created / conversation_updated event received');
  });

  it('returns message output when schema is falsy', async () => {
    const events$ = of({
      type: ChatEventType.roundComplete,
      data: {
        round: {
          id: 'r-1',
          response: { message: 'hello world', structured_output: null },
        },
      },
    });

    const executionService = makeExecutionService(events$) as any;

    const result = await runInnerAgent({
      abortSignal,
      executionService,
      params: baseParams,
      request,
      schema: undefined,
      storeConversation: false,
    });

    expect(result.outputMessage).toBe('hello world');
    expect(result.outputConversationId).toBeUndefined();
  });

  it('returns JSON-stringified structured_output when schema is truthy', async () => {
    const structuredOutput = { key: 'value' };

    const events$ = of({
      type: ChatEventType.roundComplete,
      data: {
        round: {
          id: 'r-1',
          response: { message: '', structured_output: structuredOutput },
        },
      },
    });

    const executionService = makeExecutionService(events$) as any;

    const result = await runInnerAgent({
      abortSignal,
      executionService,
      params: baseParams,
      request,
      schema: { type: 'object' },
      storeConversation: false,
    });

    expect(result.outputMessage).toBe(JSON.stringify(structuredOutput));
  });

  it('returns outputConversationId from conversation_created event when storeConversation is true', async () => {
    const events$ = of(
      {
        type: ChatEventType.conversationCreated,
        data: { conversation_id: 'c-42', title: 't' },
      },
      {
        type: ChatEventType.roundComplete,
        data: {
          round: {
            id: 'r-1',
            response: { message: 'ok', structured_output: null },
          },
        },
      }
    );

    const executionService = makeExecutionService(events$) as any;

    const result = await runInnerAgent({
      abortSignal,
      executionService,
      params: { ...baseParams, storeConversation: true },
      request,
      schema: undefined,
      storeConversation: true,
    });

    expect(result.outputConversationId).toBe('c-42');
  });

  it('returns outputConversationId from conversation_updated event when storeConversation is true', async () => {
    const events$ = of(
      {
        type: ChatEventType.conversationUpdated,
        data: { conversation_id: 'c-updated', title: 't' },
      },
      {
        type: ChatEventType.roundComplete,
        data: {
          round: {
            id: 'r-1',
            response: { message: 'ok', structured_output: null },
          },
        },
      }
    );

    const executionService = makeExecutionService(events$) as any;

    const result = await runInnerAgent({
      abortSignal,
      executionService,
      params: { ...baseParams, storeConversation: true },
      request,
      schema: undefined,
      storeConversation: true,
    });

    expect(result.outputConversationId).toBe('c-updated');
  });
});
