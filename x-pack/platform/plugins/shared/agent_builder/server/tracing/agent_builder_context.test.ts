/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { context as otelContext, propagation, TraceFlags } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import type { tracing } from '@elastic/opentelemetry-node/sdk';
import { CONVERSATION_ID_BAGGAGE_KEY } from '@kbn/inference-tracing';
import {
  AGENT_BUILDER_OWNER_BAGGAGE_KEY,
  AGENT_BUILDER_OWNER_BAGGAGE_VALUE,
  SPACE_ID_BAGGAGE_KEY,
  TRACES_NAMESPACE_BAGGAGE_KEY,
  isAgentBuilderSpan,
  withAgentBuilderContext,
} from './agent_builder_context';

const getActiveBaggageEntry = (key: string): string | undefined => {
  const baggage = propagation.getBaggage(otelContext.active());
  return baggage?.getEntry(key)?.value;
};

describe('withAgentBuilderContext', () => {
  // The default no-op OTel context manager ignores `context.with(...)`, so a real
  // (AsyncLocalStorage-backed) context manager is required to observe the baggage
  // that `withAgentBuilderContext` sets on the active context inside its callback.
  let contextManager: AsyncLocalStorageContextManager;

  beforeEach(() => {
    contextManager = new AsyncLocalStorageContextManager();
    otelContext.setGlobalContextManager(contextManager);
    contextManager.enable();
  });

  afterEach(() => {
    contextManager.disable();
  });

  it('always sets the Agent Builder ownership baggage', () => {
    withAgentBuilderContext(() => {
      expect(getActiveBaggageEntry(AGENT_BUILDER_OWNER_BAGGAGE_KEY)).toBe(
        AGENT_BUILDER_OWNER_BAGGAGE_VALUE
      );
    });
  });

  it('sets the traces-namespace baggage to "<spaceId>.<agentId>" when both are provided', () => {
    withAgentBuilderContext(
      () => {
        expect(getActiveBaggageEntry(TRACES_NAMESPACE_BAGGAGE_KEY)).toBe('marketing.sales-bot');
        expect(getActiveBaggageEntry(SPACE_ID_BAGGAGE_KEY)).toBe('marketing');
      },
      { spaceId: 'marketing', agentId: 'sales-bot' }
    );
  });

  it('falls back to the space id alone when the agent cannot be resolved', () => {
    withAgentBuilderContext(
      () => {
        expect(getActiveBaggageEntry(TRACES_NAMESPACE_BAGGAGE_KEY)).toBe('marketing');
      },
      { spaceId: 'marketing' }
    );
  });

  it('never sets the traces-namespace baggage without a space id', () => {
    withAgentBuilderContext(
      () => {
        expect(getActiveBaggageEntry(TRACES_NAMESPACE_BAGGAGE_KEY)).toBeUndefined();
      },
      { agentId: 'sales-bot' }
    );
  });

  it('sets the conversation-id baggage when provided', () => {
    withAgentBuilderContext(
      () => {
        expect(getActiveBaggageEntry(CONVERSATION_ID_BAGGAGE_KEY)).toBe('conversation-1');
      },
      { spaceId: 'default', conversationId: 'conversation-1' }
    );
  });

  it('does not set the conversation-id baggage when omitted', () => {
    withAgentBuilderContext(
      () => {
        expect(getActiveBaggageEntry(CONVERSATION_ID_BAGGAGE_KEY)).toBeUndefined();
      },
      { spaceId: 'default' }
    );
  });

  it('preserves existing baggage entries set outside the callback', () => {
    const baggage = propagation.createBaggage({ 'custom.key': { value: 'custom-value' } });
    const ctx = propagation.setBaggage(otelContext.active(), baggage);

    otelContext.with(ctx, () => {
      withAgentBuilderContext(
        () => {
          expect(getActiveBaggageEntry('custom.key')).toBe('custom-value');
          expect(getActiveBaggageEntry(AGENT_BUILDER_OWNER_BAGGAGE_KEY)).toBe(
            AGENT_BUILDER_OWNER_BAGGAGE_VALUE
          );
        },
        { spaceId: 'default' }
      );
    });
  });

  it('does not leak baggage outside of the callback scope', () => {
    withAgentBuilderContext(() => {}, { spaceId: 'default' });

    expect(getActiveBaggageEntry(TRACES_NAMESPACE_BAGGAGE_KEY)).toBeUndefined();
  });
});

describe('isAgentBuilderSpan', () => {
  const buildSpan = (name: string): tracing.Span =>
    ({
      name,
      instrumentationScope: { name: 'inference' },
      spanContext: () => ({ traceId: 't', spanId: 's', traceFlags: TraceFlags.NONE }),
    } as unknown as tracing.Span);

  it('returns false when the Agent Builder ownership baggage is missing', () => {
    const span = buildSpan('chat gpt-4');
    expect(isAgentBuilderSpan(span, otelContext.active())).toBe(false);
  });

  it('returns true for an inference span within an Agent Builder context', () => {
    const baggage = propagation.createBaggage({
      [AGENT_BUILDER_OWNER_BAGGAGE_KEY]: { value: AGENT_BUILDER_OWNER_BAGGAGE_VALUE },
    });
    const ctx = propagation.setBaggage(otelContext.active(), baggage);
    const span = buildSpan('chat gpt-4');

    expect(isAgentBuilderSpan(span, ctx)).toBe(true);
  });
});
