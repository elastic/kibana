/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const {
  connectorIdToOpenrouterModel,
  buildOpenrouterConnectorFromVault,
} = require('./ai_connectors');

describe('connectorIdToOpenrouterModel', () => {
  it('strips the openrouter- prefix and replaces the first dash with a slash', () => {
    expect(connectorIdToOpenrouterModel('openrouter-openai-gpt-4o')).toBe('openai/gpt-4o');
  });

  it('passes through native provider/model ids', () => {
    expect(connectorIdToOpenrouterModel('anthropic/claude-sonnet-4.6')).toBe(
      'anthropic/claude-sonnet-4.6'
    );
  });
});

describe('buildOpenrouterConnectorFromVault', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    delete process.env.OPENROUTER_BASE_URL;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.EVAL_OPENROUTER_MODEL;
    delete process.env.KBN_EVALS_CONFIG_B64;
  });

  it('uses EVAL_OPENROUTER_MODEL when set', () => {
    process.env.OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
    process.env.OPENROUTER_API_KEY = 'sk-test';
    process.env.EVAL_OPENROUTER_MODEL = 'anthropic/claude-sonnet-4.6';

    const connector = buildOpenrouterConnectorFromVault('openrouter-anthropic-claude-sonnet-4-6');

    expect(connector.config.defaultModel).toBe('anthropic/claude-sonnet-4.6');
    expect(connector.config.apiUrl).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(connector.secrets.apiKey).toBe('sk-test');
  });

  it('uses the first-dash heuristic when EVAL_OPENROUTER_MODEL is unset', () => {
    process.env.OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
    process.env.OPENROUTER_API_KEY = 'sk-test';

    const connector = buildOpenrouterConnectorFromVault('openrouter-openai-gpt-4o');

    expect(connector.config.defaultModel).toBe('openai/gpt-4o');
  });
});
