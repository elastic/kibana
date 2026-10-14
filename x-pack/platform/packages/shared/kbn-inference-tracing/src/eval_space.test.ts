/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ROOT_CONTEXT, context, propagation } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import type { tracing } from '@elastic/opentelemetry-node/sdk';
import {
  DATA_STREAM_NAMESPACE_ATTRIBUTE,
  EvalSpaceSpanProcessor,
  carryEvalSpaceId,
  getEvalSpaceId,
  setEvalSpaceId,
  withEvalSpace,
} from './eval_space';

const createSpan = ({
  attributes = {},
  recording = true,
}: { attributes?: Record<string, unknown>; recording?: boolean } = {}) => {
  const setAttribute = jest.fn();
  const span = {
    attributes,
    isRecording: () => recording,
    setAttribute,
  } as unknown as tracing.Span;
  return { span, setAttribute };
};

describe('eval space', () => {
  let contextManager: AsyncLocalStorageContextManager;

  beforeEach(() => {
    contextManager = new AsyncLocalStorageContextManager();
    context.setGlobalContextManager(contextManager);
    contextManager.enable();
  });

  afterEach(() => {
    contextManager.disable();
    context.disable();
  });

  describe('setEvalSpaceId / getEvalSpaceId', () => {
    it('round-trips the space through a context', () => {
      expect(getEvalSpaceId(setEvalSpaceId(ROOT_CONTEXT, 'marketing'))).toBe('marketing');
    });

    it('returns undefined when no space was set', () => {
      expect(getEvalSpaceId(ROOT_CONTEXT)).toBeUndefined();
    });

    it('leaves the context untouched when no space is given', () => {
      expect(setEvalSpaceId(ROOT_CONTEXT, undefined)).toBe(ROOT_CONTEXT);
    });

    it('is not populated from baggage, which a caller can send in a request header', () => {
      const baggage = propagation.createBaggage({
        'kibana.evals.space_id': { value: 'other-space' },
      });

      expect(getEvalSpaceId(propagation.setBaggage(ROOT_CONTEXT, baggage))).toBeUndefined();
    });
  });

  describe('withEvalSpace', () => {
    it('makes the space active for the callback only', () => {
      let inside: string | undefined;

      withEvalSpace('marketing', () => {
        inside = getEvalSpaceId(context.active());
      });

      expect(inside).toBe('marketing');
      expect(getEvalSpaceId(context.active())).toBeUndefined();
    });

    it('keeps the space across awaits', async () => {
      const inside = await withEvalSpace('marketing', async () => {
        await new Promise((resolve) => setImmediate(resolve));
        return getEvalSpaceId(context.active());
      });

      expect(inside).toBe('marketing');
    });

    it('returns the callback result and just runs it without a space', () => {
      expect(withEvalSpace(undefined, () => 42)).toBe(42);
      expect(withEvalSpace('marketing', () => 43)).toBe(43);
    });

    it('lets an inner space win over an outer one', () => {
      const seen: Array<string | undefined> = [];

      withEvalSpace('outer', () => {
        withEvalSpace('inner', () => seen.push(getEvalSpaceId(context.active())));
        seen.push(getEvalSpaceId(context.active()));
      });

      expect(seen).toEqual(['inner', 'outer']);
    });
  });

  describe('carryEvalSpaceId', () => {
    it('copies the active space onto a fresh context', () => {
      const carried = withEvalSpace('marketing', () => carryEvalSpaceId(ROOT_CONTEXT));

      expect(getEvalSpaceId(carried)).toBe('marketing');
    });

    it('returns the target as is when no space is active', () => {
      expect(carryEvalSpaceId(ROOT_CONTEXT)).toBe(ROOT_CONTEXT);
    });
  });

  describe('EvalSpaceSpanProcessor', () => {
    const processor = new EvalSpaceSpanProcessor();

    it('routes a span to the space of its parent context', () => {
      const { span, setAttribute } = createSpan();

      processor.onStart(span, setEvalSpaceId(ROOT_CONTEXT, 'marketing'));

      expect(setAttribute).toHaveBeenCalledWith(DATA_STREAM_NAMESPACE_ATTRIBUTE, 'marketing');
    });

    it('leaves spans outside any eval space alone', () => {
      const { span, setAttribute } = createSpan();

      processor.onStart(span, ROOT_CONTEXT);

      expect(setAttribute).not.toHaveBeenCalled();
    });

    it('overrides a namespace an earlier processor derived from inbound baggage', () => {
      const { span, setAttribute } = createSpan({
        attributes: { [DATA_STREAM_NAMESPACE_ATTRIBUTE]: 'other-space' },
      });

      processor.onStart(span, setEvalSpaceId(ROOT_CONTEXT, 'marketing'));

      expect(setAttribute).toHaveBeenCalledWith(DATA_STREAM_NAMESPACE_ATTRIBUTE, 'marketing');
    });

    it('leaves a namespace alone outside any eval space', () => {
      const { span, setAttribute } = createSpan({
        attributes: { [DATA_STREAM_NAMESPACE_ATTRIBUTE]: 'sales' },
      });

      processor.onStart(span, ROOT_CONTEXT);

      expect(setAttribute).not.toHaveBeenCalled();
    });

    it('skips spans that are not recording', () => {
      const { span, setAttribute } = createSpan({ recording: false });

      processor.onStart(span, setEvalSpaceId(ROOT_CONTEXT, 'marketing'));

      expect(setAttribute).not.toHaveBeenCalled();
    });
  });
});
