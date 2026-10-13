/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { priceTokenUsage, toPriceKey } from './price_usage';

describe('toPriceKey', () => {
  it.each([
    ['.anthropic-claude-4.5-haiku-chat_completion', 'anthropic-claude-4-5-haiku'],
    ['.google-gemini-3.8-flash-chat_completion', 'google-gemini-3-8-flash'],
    ['.openai-gpt-5.6-luna-completion', 'openai-gpt-5-6-luna'],
  ])('maps the EIS connector %s to %s', (connectorId, expected) => {
    expect(toPriceKey(connectorId)).toBe(expected);
  });

  it.each([undefined, '', 'my-openai-connector', '.'])('has no price key for %p', (connectorId) => {
    expect(toPriceKey(connectorId)).toBeUndefined();
  });
});

describe('priceTokenUsage', () => {
  it('prices uncached input, cached input and output separately', () => {
    const cost = priceTokenUsage(
      { inputTokens: 1_000_000, outputTokens: 500_000, cachedTokens: 200_000 },
      { input: 1.5, output: 7, cacheRead: 0.15 }
    );

    // 800k uncached × $1.5 + 200k cached × $0.15 + 500k output × $7
    expect(cost).toBeCloseTo(1.2 + 0.03 + 3.5);
  });

  it('bills cached input at the input price when the model has no cache price', () => {
    const cost = priceTokenUsage(
      { inputTokens: 1_000_000, outputTokens: 0, cachedTokens: 400_000 },
      { input: 2, output: 8 }
    );

    expect(cost).toBeCloseTo(2);
  });

  it('never counts more cached tokens than input tokens', () => {
    const cost = priceTokenUsage(
      { inputTokens: 100, outputTokens: 0, cachedTokens: 1000 },
      { input: 10, output: 10, cacheRead: 1 }
    );

    expect(cost).toBeCloseTo(100 / 1_000_000);
  });
});
