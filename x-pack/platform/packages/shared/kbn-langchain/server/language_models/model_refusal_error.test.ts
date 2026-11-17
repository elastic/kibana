/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MODEL_REFUSAL_ERROR_CODE,
  MODEL_REFUSAL_ERROR_MESSAGE_PREFIX,
  ModelRefusalError,
  PROVIDER_CONTENT_FILTER_REFUSAL,
  getRefusalSummary,
  isModelRefusalError,
  throwIfModelRefusal,
} from './model_refusal_error';

const CONTENT_FILTER_REFUSAL =
  'The response was stopped by the provider content filter (finish_reason: content_filter).';

describe('throwIfModelRefusal', () => {
  it('throws a ModelRefusalError when the refusal arrives with no content', () => {
    expect(() =>
      throwIfModelRefusal({
        connectorId: 'connector-1',
        content: '',
        model: 'claude-opus-5-5',
        refusal: CONTENT_FILTER_REFUSAL,
      })
    ).toThrow(ModelRefusalError);
  });

  it('throws when the model wrote partial content before it was stopped', () => {
    let thrown: unknown;

    try {
      throwIfModelRefusal({
        connectorId: 'connector-1',
        content: '{"insights":[{"title":',
        refusal: CONTENT_FILTER_REFUSAL,
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toMatchObject({
      code: MODEL_REFUSAL_ERROR_CODE,
      connectorId: 'connector-1',
      partialContentLength: 22,
      refusal: CONTENT_FILTER_REFUSAL,
    });
  });

  it('names the content filter in the message, so users can see what happened', () => {
    expect(() =>
      throwIfModelRefusal({
        connectorId: 'connector-1',
        content: '',
        refusal: CONTENT_FILTER_REFUSAL,
      })
    ).toThrow(
      `${MODEL_REFUSAL_ERROR_MESSAGE_PREFIX}: The response was stopped by the provider content filter (finish_reason: content_filter).`
    );
  });

  it.each([undefined, null, '', '   '])('does nothing when the refusal is %p', (refusal) => {
    expect(() =>
      throwIfModelRefusal({ connectorId: 'connector-1', content: 'ok', refusal })
    ).not.toThrow();
  });
});

describe('getRefusalSummary', () => {
  it("keeps Kibana's content-filter text, which the inference plugin sets", () => {
    expect(getRefusalSummary(CONTENT_FILTER_REFUSAL)).toBe(CONTENT_FILTER_REFUSAL);
  });

  it('matches the inference plugin text exactly', () => {
    expect(PROVIDER_CONTENT_FILTER_REFUSAL).toBe(CONTENT_FILTER_REFUSAL);
  });

  it("replaces a provider's own refusal text with its length", () => {
    expect(getRefusalSummary("I can't help with host-7.")).toBe(
      'the provider returned its own refusal text (25 characters, not included)'
    );
  });
});

describe('ModelRefusalError', () => {
  const providerRefusal = "I can't help with host-7.";

  it('omits provider-written text from the message, which is persisted and sent to telemetry', () => {
    const error = new ModelRefusalError({
      connectorId: 'connector-1',
      partialContentLength: 0,
      refusal: providerRefusal,
    });

    expect(error.message).not.toContain('host-7');
  });

  it('keeps the full refusal text on the error', () => {
    const error = new ModelRefusalError({
      connectorId: 'connector-1',
      partialContentLength: 0,
      refusal: providerRefusal,
    });

    expect(error.refusal).toBe(providerRefusal);
  });

  it('keeps the message prefix that classifiers match on', () => {
    const error = new ModelRefusalError({
      connectorId: 'connector-1',
      partialContentLength: 0,
      refusal: providerRefusal,
    });

    expect(error.message.startsWith(MODEL_REFUSAL_ERROR_MESSAGE_PREFIX)).toBe(true);
  });
});

describe('isModelRefusalError', () => {
  it('returns true for a ModelRefusalError', () => {
    expect(
      isModelRefusalError(
        new ModelRefusalError({ connectorId: 'c', partialContentLength: 0, refusal: 'r' })
      )
    ).toBe(true);
  });

  it('returns true for an error that carries the refusal code', () => {
    const error = Object.assign(new Error('refused'), { code: MODEL_REFUSAL_ERROR_CODE });

    expect(isModelRefusalError(error)).toBe(true);
  });

  it.each([new Error('Unexpected end of JSON input'), 'MODEL_REFUSAL', undefined])(
    'returns false for %p',
    (value) => {
      expect(isModelRefusalError(value)).toBe(false);
    }
  );
});
