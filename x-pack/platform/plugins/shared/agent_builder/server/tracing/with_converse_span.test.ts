/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMPTY, firstValueFrom, lastValueFrom, of, toArray } from 'rxjs';
import type { Span } from '@opentelemetry/api';
import type { ChatEvent } from '@kbn/agent-builder-common';
import { withConverseSpan } from './with_converse_span';

const mockWithActiveInferenceSpan = jest.fn();

jest.mock('@kbn/inference-tracing', () => ({
  withActiveInferenceSpan: (
    name: string,
    opts: { attributes?: Record<string, unknown> },
    fn: (span?: Span) => unknown
  ) => {
    mockWithActiveInferenceSpan(name, opts);
    return fn(undefined);
  },
  ElasticGenAIAttributes: {
    InferenceSpanKind: 'elastic.inference.span.kind',
    AgentId: 'elastic.agent.id',
    AgentConversationId: 'elastic.agent.conversationId',
  },
  GenAISemanticConventions: {
    GenAIConversationId: 'gen_ai.conversation.id',
  },
}));

describe('withConverseSpan', () => {
  beforeEach(() => {
    mockWithActiveInferenceSpan.mockClear();
  });

  it('creates a Converse inference span with CHAIN kind and the expected base attributes', async () => {
    await firstValueFrom(
      withConverseSpan({ agentId: 'agent-1', conversationId: 'conv-1' }, () => of({} as ChatEvent))
    );

    expect(mockWithActiveInferenceSpan).toHaveBeenCalledTimes(1);
    const [name, opts] = mockWithActiveInferenceSpan.mock.calls[0];
    expect(name).toBe('Converse');
    expect(opts.attributes).toMatchObject({
      'elastic.inference.span.kind': 'CHAIN',
      'elastic.agent.id': 'agent-1',
      'elastic.agent.conversationId': 'conv-1',
      'gen_ai.conversation.id': 'conv-1',
    });
  });

  it('stamps user.id and user.name attributes when provided', async () => {
    await firstValueFrom(
      withConverseSpan(
        {
          agentId: 'agent-1',
          conversationId: 'conv-1',
          userId: 'profile-uid-123',
          userName: 'alice',
        },
        () => of({} as ChatEvent)
      )
    );

    const [, opts] = mockWithActiveInferenceSpan.mock.calls[0];
    expect(opts.attributes).toMatchObject({
      'user.id': 'profile-uid-123',
      'user.name': 'alice',
    });
  });

  it('leaves user.id and user.name unset when not provided', async () => {
    await lastValueFrom(
      withConverseSpan({ agentId: 'agent-1', conversationId: 'conv-1' }, () => EMPTY).pipe(
        toArray()
      )
    );

    const [, opts] = mockWithActiveInferenceSpan.mock.calls[0];
    expect(opts.attributes['user.id']).toBeUndefined();
    expect(opts.attributes['user.name']).toBeUndefined();
  });

  it('supports stamping just user.name (no profile UID available)', async () => {
    await firstValueFrom(
      withConverseSpan({ agentId: 'agent-1', conversationId: 'conv-1', userName: 'bob' }, () =>
        of({} as ChatEvent)
      )
    );

    const [, opts] = mockWithActiveInferenceSpan.mock.calls[0];
    expect(opts.attributes['user.id']).toBeUndefined();
    expect(opts.attributes['user.name']).toBe('bob');
  });
});
