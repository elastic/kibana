/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface TokenRates {
  /** USD per 1M uncached input tokens. */
  input: number;
  /** USD per 1M cache-read input tokens; `null` when the catalog lists no cache price. */
  cachedInput: number | null;
  /** USD per 1M output tokens. */
  output: number;
}

export interface ModelPrice extends TokenRates {
  /** Rates for requests whose prompt has more than `aboveInputTokens` input tokens. */
  longContext?: TokenRates & { aboveInputTokens: number };
}

export interface TokenUsage {
  /** Total input tokens, including cache reads (Kibana inference `prompt` semantics). */
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
}

const LONG_CONTEXT_ABOVE_200K = 200_000;
const LONG_CONTEXT_ABOVE_272K = 272_000;

/** Date of the price catalog snapshot below, recorded with each cost score. */
export const PRICE_TABLE_VERSION = '2026-11-05';

/**
 * EIS chat completion list prices, keyed by EIS model id with dots replaced by dashes
 * (`openai-gpt-5.6-sol` -> `openai-gpt-5-6-sol`).
 *
 * Source: Elastic Cloud price catalog, https://cloud.elastic.co/api/v1/prices/base_prices
 * (`global.inference-chat-{input,cache-read,output}_<model>` rows), snapshot taken on `PRICE_TABLE_VERSION`.
 * Models priced by prompt size (`<=272k` / `>272k` rows) carry the upper tier in `longContext`.
 * To update, re-read the catalog, edit the rows below and bump `PRICE_TABLE_VERSION`. A model missing here is reported as
 * unpriced by the cost evaluator rather than costed at zero.
 */
const EIS_MODEL_PRICES_USD_PER_1M_TOKENS: Readonly<Record<string, ModelPrice>> = {
  'anthropic-claude-3-7-sonnet': { input: 4.5, cachedInput: null, output: 21 },
  'anthropic-claude-4-5-haiku': { input: 1.5, cachedInput: 0.15, output: 7 },
  'anthropic-claude-4-5-opus': { input: 7.5, cachedInput: 0.75, output: 35 },
  'anthropic-claude-4-5-sonnet': {
    input: 4.5,
    cachedInput: 0.45,
    output: 21,
    longContext: {
      aboveInputTokens: LONG_CONTEXT_ABOVE_200K,
      input: 9,
      cachedInput: 0.9,
      output: 31.5,
    },
  },
  'anthropic-claude-4-6-opus': { input: 7.5, cachedInput: 0.75, output: 35 },
  'anthropic-claude-4-6-sonnet': { input: 4.5, cachedInput: 0.45, output: 21 },
  'anthropic-claude-4-7-opus': { input: 7.5, cachedInput: 0.75, output: 35 },
  'anthropic-claude-4-8-opus': { input: 7.5, cachedInput: 0.75, output: 35 },
  'anthropic-claude-5-fable': { input: 15, cachedInput: 1.5, output: 70 },
  'anthropic-claude-5-1-fable': { input: 15, cachedInput: 0.375, output: 70 },
  'anthropic-claude-5-opus': { input: 7.5, cachedInput: 0.75, output: 35 },
  'anthropic-claude-5-5-opus': { input: 6, cachedInput: 0.3, output: 28 },
  'anthropic-claude-5-sonnet': { input: 3, cachedInput: 0.3, output: 14 },
  'anthropic-claude-5-5-sonnet': { input: 3, cachedInput: 0.3, output: 14 },
  'google-gemini-2-5-flash': { input: 0.45, cachedInput: 0.045, output: 3.5 },
  'google-gemini-2-5-flash-lite': { input: 0.15, cachedInput: 0.015, output: 0.56 },
  'google-gemini-2-5-pro': {
    input: 1.875,
    cachedInput: 0.1875,
    output: 14,
    longContext: {
      aboveInputTokens: LONG_CONTEXT_ABOVE_200K,
      input: 3.75,
      cachedInput: 0.375,
      output: 21,
    },
  },
  'google-gemini-3-0-flash': { input: 0.75, cachedInput: 0.075, output: 4.2 },
  'google-gemini-3-0-pro': { input: 3, cachedInput: null, output: 16.8 },
  'google-gemini-3-1-flash-lite': { input: 0.375, cachedInput: 0.0375, output: 2.1 },
  'google-gemini-3-1-pro': {
    input: 3,
    cachedInput: 0.3,
    output: 16.8,
    longContext: {
      aboveInputTokens: LONG_CONTEXT_ABOVE_200K,
      input: 6,
      cachedInput: 0.6,
      output: 25.2,
    },
  },
  'google-gemini-3-5-flash': { input: 2.25, cachedInput: 0.225, output: 12.6 },
  'google-gemini-3-5-flash-lite': { input: 0.45, cachedInput: 0.045, output: 3.5 },
  'google-gemini-3-6-flash': { input: 1.125, cachedInput: 0.1125, output: 5.25 },
  'google-gemini-3-7-flash': { input: 2.25, cachedInput: 0.225, output: 10.5 },
  'google-gemini-3-8-flash': { input: 2.25, cachedInput: 0.225, output: 10.5 },
  'gp-llm-v2': { input: 4.5, cachedInput: 0.45, output: 21 },
  'jina-ocr-v1': { input: 0.75, cachedInput: null, output: 2.8 },
  'moonshot-kimi-k3': { input: 4.5, cachedInput: 0.45, output: 21 },
  'nvidia-nemotron-3-nano': { input: 0.09, cachedInput: null, output: 0.336 },
  'nvidia-nemotron-3-ultra': { input: 0.9, cachedInput: 0.18, output: 3.36 },
  'nvidia-nemotron-3-5-lightning': { input: 0.105, cachedInput: 0.06, output: 0.28 },
  'nvidia-nemotron-3-5-super-vl': { input: 0.225, cachedInput: 0.03, output: 0.7 },
  'openai-gpt-4-1': { input: 3, cachedInput: null, output: 11.2 },
  'openai-gpt-4-1-mini': { input: 0.6, cachedInput: null, output: 2.24 },
  'openai-gpt-5-2': { input: 2.625, cachedInput: 0.2625, output: 19.6 },
  'openai-gpt-5-4': {
    input: 3.75,
    cachedInput: 0.375,
    output: 21,
    longContext: {
      aboveInputTokens: LONG_CONTEXT_ABOVE_272K,
      input: 7.5,
      cachedInput: 0.75,
      output: 31.5,
    },
  },
  'openai-gpt-5-4-mini': { input: 1.125, cachedInput: 0.1125, output: 6.3 },
  'openai-gpt-5-4-nano': { input: 0.3, cachedInput: 0.03, output: 1.75 },
  'openai-gpt-5-4-pro': {
    input: 45,
    cachedInput: null,
    output: 252,
    longContext: {
      aboveInputTokens: LONG_CONTEXT_ABOVE_272K,
      input: 90,
      cachedInput: null,
      output: 378,
    },
  },
  'openai-gpt-5-5': {
    input: 7.5,
    cachedInput: 0.75,
    output: 42,
    longContext: {
      aboveInputTokens: LONG_CONTEXT_ABOVE_272K,
      input: 15,
      cachedInput: 1.5,
      output: 63,
    },
  },
  'openai-gpt-5-6-luna': {
    input: 0.3,
    cachedInput: 0.03,
    output: 1.68,
    longContext: {
      aboveInputTokens: LONG_CONTEXT_ABOVE_272K,
      input: 0.6,
      cachedInput: 0.06,
      output: 2.52,
    },
  },
  'openai-gpt-5-6-luna-pro': {
    input: 0.3,
    cachedInput: 0.03,
    output: 1.68,
    longContext: {
      aboveInputTokens: LONG_CONTEXT_ABOVE_272K,
      input: 0.6,
      cachedInput: 0.06,
      output: 2.52,
    },
  },
  'openai-gpt-5-6-sol': {
    input: 7.5,
    cachedInput: 0.75,
    output: 42,
    longContext: {
      aboveInputTokens: LONG_CONTEXT_ABOVE_272K,
      input: 15,
      cachedInput: 1.5,
      output: 63,
    },
  },
  'openai-gpt-5-6-sol-pro': {
    input: 7.5,
    cachedInput: 0.75,
    output: 42,
    longContext: {
      aboveInputTokens: LONG_CONTEXT_ABOVE_272K,
      input: 15,
      cachedInput: 1.5,
      output: 63,
    },
  },
  'openai-gpt-5-6-terra': {
    input: 3,
    cachedInput: 0.3,
    output: 16.8,
    longContext: {
      aboveInputTokens: LONG_CONTEXT_ABOVE_272K,
      input: 6,
      cachedInput: 0.6,
      output: 25.2,
    },
  },
  'openai-gpt-5-6-terra-pro': {
    input: 3,
    cachedInput: 0.3,
    output: 16.8,
    longContext: {
      aboveInputTokens: LONG_CONTEXT_ABOVE_272K,
      input: 6,
      cachedInput: 0.6,
      output: 25.2,
    },
  },
  'openai-gpt-6-astra': {
    input: 15,
    cachedInput: 1.5,
    output: 70,
    longContext: {
      aboveInputTokens: LONG_CONTEXT_ABOVE_272K,
      input: 30,
      cachedInput: 3,
      output: 105,
    },
  },
  'openai-gpt-6-astra-pro': {
    input: 15,
    cachedInput: 1.5,
    output: 70,
    longContext: {
      aboveInputTokens: LONG_CONTEXT_ABOVE_272K,
      input: 30,
      cachedInput: 3,
      output: 105,
    },
  },
  'openai-gpt-6-luna': {
    input: 0.15,
    cachedInput: 0.015,
    output: 0.7,
    longContext: {
      aboveInputTokens: LONG_CONTEXT_ABOVE_272K,
      input: 0.3,
      cachedInput: 0.03,
      output: 1.05,
    },
  },
  'openai-gpt-6-luna-pro': {
    input: 0.15,
    cachedInput: 0.015,
    output: 0.7,
    longContext: {
      aboveInputTokens: LONG_CONTEXT_ABOVE_272K,
      input: 0.3,
      cachedInput: 0.03,
      output: 1.05,
    },
  },
  'openai-gpt-6-sol': {
    input: 3,
    cachedInput: 0.3,
    output: 14,
    longContext: {
      aboveInputTokens: LONG_CONTEXT_ABOVE_272K,
      input: 6,
      cachedInput: 0.6,
      output: 21,
    },
  },
  'openai-gpt-6-sol-pro': {
    input: 3,
    cachedInput: 0.3,
    output: 14,
    longContext: {
      aboveInputTokens: LONG_CONTEXT_ABOVE_272K,
      input: 6,
      cachedInput: 0.6,
      output: 21,
    },
  },
  'openai-gpt-oss-20b': { input: 0.105, cachedInput: null, output: 0.35 },
  'openai-gpt-oss-120b': { input: 0.225, cachedInput: null, output: 0.84 },
  'qwen-3-8-2-4t-a95b': { input: 3, cachedInput: 0.3, output: 8.4 },
  'rainbow-sprinkles': { input: 4.5, cachedInput: 0.45, output: 21 },
  'typesafe-jev-1-13': { input: 0.063, cachedInput: null, output: 0 },
  'zai-glm-5-2': { input: 2.1, cachedInput: 0.39, output: 6.16 },
  'zai-glm-5-3': { input: 2.1, cachedInput: 0.39, output: 6.16 },
};

const TOKENS_PER_PRICE_UNIT = 1_000_000;

/** Accepts a traced EIS model id (`openai-gpt-5.6-sol`) or an EIS connector id (`eis-openai-gpt-5-6-sol`). */
export const getModelPrice = (model: string | null | undefined): ModelPrice | undefined => {
  if (!model) {
    return undefined;
  }

  const key = model.trim().toLowerCase().replace(/^eis-/, '').replace(/\./g, '-');
  return Object.hasOwn(EIS_MODEL_PRICES_USD_PER_1M_TOKENS, key)
    ? EIS_MODEL_PRICES_USD_PER_1M_TOKENS[key]
    : undefined;
};

/** Prompt-size tier boundaries used in the price table, largest first. */
export const LONG_CONTEXT_THRESHOLDS: readonly number[] = [
  LONG_CONTEXT_ABOVE_272K,
  LONG_CONTEXT_ABOVE_200K,
];

/** Picks the rates for requests whose prompt exceeds `promptTier` input tokens (0 for small prompts). */
export const getTokenRates = (
  { longContext, ...base }: ModelPrice,
  promptTier: number
): TokenRates => (longContext && promptTier >= longContext.aboveInputTokens ? longContext : base);

/** Prices token usage in USD; `cachedTokens` must not exceed `inputTokens`, which includes them. */
export const estimateCostUsd = (
  { inputTokens, cachedTokens, outputTokens }: TokenUsage,
  { input, cachedInput, output }: TokenRates
): number => {
  const uncached = inputTokens - cachedTokens;

  return (
    (uncached * input + cachedTokens * (cachedInput ?? input) + outputTokens * output) /
    TOKENS_PER_PRICE_UNIT
  );
};
