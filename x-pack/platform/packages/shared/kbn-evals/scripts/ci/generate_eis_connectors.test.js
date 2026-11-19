/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { buildEisConnectors, filterEisConnectors } = require('./generate_eis_connectors');

const MODELS = [
  { inferenceId: '.openai-gpt-5.4-chat_completion', modelId: 'openai-gpt-5.4' },
  { inferenceId: '.openai-gpt-6-sol-chat_completion', modelId: 'openai-gpt-6-sol' },
  {
    inferenceId: '.anthropic-claude-4.6-opus-chat_completion',
    modelId: 'anthropic-claude-4.6-opus',
  },
  { inferenceId: '.google-gemini-3.0-flash-chat_completion', modelId: 'google-gemini-3.0-flash' },
];

const ALL_IDS = [
  'eis-openai-gpt-5-4',
  'eis-openai-gpt-6-sol',
  'eis-anthropic-claude-4-6-opus',
  'eis-google-gemini-3-0-flash',
];

const ids = (connectors) => Object.keys(connectors);

describe('buildEisConnectors', () => {
  it('emits one elastic chat_completion endpoint per model and skips malformed entries', () => {
    const connectors = buildEisConnectors([...MODELS, { modelId: 'no-inference-id' }, null]);

    expect(ids(connectors)).toEqual(ALL_IDS);
    expect(connectors['eis-openai-gpt-5-4']).toEqual({
      name: 'EIS openai-gpt-5.4',
      inferenceId: '.openai-gpt-5.4-chat_completion',
      provider: 'elastic',
      taskType: 'chat_completion',
      providerConfig: { model_id: 'openai-gpt-5.4' },
    });
  });
});

describe('filterEisConnectors', () => {
  const connectors = buildEisConnectors(MODELS);

  it('keeps every model when no model groups are requested', () => {
    expect(ids(filterEisConnectors(connectors))).toEqual(ALL_IDS);
    expect(ids(filterEisConnectors(connectors, { includeIds: ['eis-openai-gpt-5-4'] }))).toEqual(
      ALL_IDS
    );
  });

  it('keeps every model when `all` is requested', () => {
    expect(ids(filterEisConnectors(connectors, { modelGroups: ['all'] }))).toEqual(ALL_IDS);
  });

  it('keeps only the requested eis/ models', () => {
    const filtered = filterEisConnectors(connectors, {
      modelGroups: ['eis/anthropic-claude-4.6-opus', 'eis/google-gemini-3.0-flash'],
    });
    expect(ids(filtered)).toEqual(['eis-anthropic-claude-4-6-opus', 'eis-google-gemini-3-0-flash']);
  });

  it('adds included connector ids such as shard judges and the evaluation connector', () => {
    const filtered = filterEisConnectors(connectors, {
      modelGroups: ['eis/google-gemini-3.0-flash'],
      includeIds: ['eis-openai-gpt-5-4', 'eis-openai-gpt-6-sol', ''],
    });
    expect(ids(filtered)).toEqual([
      'eis-openai-gpt-5-4',
      'eis-openai-gpt-6-sol',
      'eis-google-gemini-3-0-flash',
    ]);
  });

  it('returns no EIS connectors when only OpenRouter models are requested', () => {
    expect(
      ids(filterEisConnectors(connectors, { modelGroups: ['openrouter/openai/gpt-5.4'] }))
    ).toEqual([]);
  });

  it('ignores included ids that match no discovered model', () => {
    const filtered = filterEisConnectors(connectors, {
      modelGroups: ['eis/openai-gpt-5.4'],
      includeIds: ['openrouter-openai-gpt-5-4', 'eis-unknown'],
    });
    expect(ids(filtered)).toEqual(['eis-openai-gpt-5-4']);
  });
});
