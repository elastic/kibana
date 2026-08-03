/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { context as otelContext, propagation } from '@opentelemetry/api';
import { AsyncHooksContextManager } from '@opentelemetry/context-async-hooks';
import { CONVERSATION_ID_BAGGAGE_KEY } from '@kbn/inference-tracing';
import {
  AGENT_BUILDER_OWNER_BAGGAGE_KEY,
  AGENT_BUILDER_OWNER_BAGGAGE_VALUE,
  TRACES_NAMESPACE_BAGGAGE_KEY,
  withAgentBuilderContext,
} from './agent_builder_context';

const readBaggage = (key: string): string | undefined =>
  propagation.getBaggage(otelContext.active())?.getEntry(key)?.value;

describe('withAgentBuilderContext', () => {
  let contextManager: AsyncHooksContextManager;

  beforeEach(() => {
    contextManager = new AsyncHooksContextManager();
    otelContext.setGlobalContextManager(contextManager);
    contextManager.enable();
  });

  afterEach(() => {
    contextManager.disable();
  });

  it('marks the context as owned by Agent Builder', () => {
    withAgentBuilderContext(
      () => {
        expect(readBaggage(AGENT_BUILDER_OWNER_BAGGAGE_KEY)).toBe(
          AGENT_BUILDER_OWNER_BAGGAGE_VALUE
        );
      },
      { spaceId: 'default', agentId: 'my-agent' }
    );
  });

  it('routes spans to a namespace combining the space and agent ids', () => {
    withAgentBuilderContext(
      () => {
        expect(readBaggage(TRACES_NAMESPACE_BAGGAGE_KEY)).toBe('marketing.my-agent');
      },
      { spaceId: 'marketing', agentId: 'my-agent' }
    );
  });

  it('gives two agents in the same space distinct namespaces', () => {
    const namespaces = ['agent-a', 'agent-b'].map((agentId) =>
      withAgentBuilderContext(() => readBaggage(TRACES_NAMESPACE_BAGGAGE_KEY), {
        spaceId: 'default',
        agentId,
      })
    );

    expect(namespaces).toEqual(['default.agent-a', 'default.agent-b']);
  });

  it('gives the same agent id in two spaces distinct namespaces', () => {
    const namespaces = ['default', 'marketing'].map((spaceId) =>
      withAgentBuilderContext(() => readBaggage(TRACES_NAMESPACE_BAGGAGE_KEY), {
        spaceId,
        agentId: 'my-agent',
      })
    );

    expect(namespaces).toEqual(['default.my-agent', 'marketing.my-agent']);
  });

  it('propagates the conversation id when provided', () => {
    withAgentBuilderContext(
      () => {
        expect(readBaggage(CONVERSATION_ID_BAGGAGE_KEY)).toBe('conversation-1');
      },
      { spaceId: 'default', agentId: 'my-agent', conversationId: 'conversation-1' }
    );
  });

  it('omits the conversation id when absent', () => {
    withAgentBuilderContext(
      () => {
        expect(readBaggage(CONVERSATION_ID_BAGGAGE_KEY)).toBeUndefined();
      },
      { spaceId: 'default', agentId: 'my-agent' }
    );
  });

  it('preserves baggage already present on the active context', () => {
    const outerBaggage = propagation.createBaggage().setEntry('existing.key', { value: 'keep-me' });

    otelContext.with(propagation.setBaggage(otelContext.active(), outerBaggage), () => {
      withAgentBuilderContext(
        () => {
          expect(readBaggage('existing.key')).toBe('keep-me');
          expect(readBaggage(TRACES_NAMESPACE_BAGGAGE_KEY)).toBe('default.my-agent');
        },
        { spaceId: 'default', agentId: 'my-agent' }
      );
    });
  });
});
