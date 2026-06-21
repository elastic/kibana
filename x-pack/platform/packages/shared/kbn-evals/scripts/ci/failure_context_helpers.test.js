/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const {
  failureLogMetadataKey,
  truncateContextJson,
  buildTriageUserPrompt,
  buildWeeklyRollupUserPrompt,
  extractSuiteRootCauseLine,
  buildLitellmChatRequest,
  connectorIdToLitellmModel,
  buildLitellmConnectorFromVault,
  parseLitellmChatContent,
  resolveTriageModelId,
  DEFAULT_TRIAGE_MODEL_ID,
} = require('./failure_context_helpers');

describe('failure_context_helpers', () => {
  it('builds failure log metadata keys', () => {
    expect(failureLogMetadataKey('Observability AI', 'eis-gpt-4.1')).toBe(
      'kbn-evals:suite-failure-log:observability-ai:eis-gpt-4-1'
    );
  });

  it('truncates oversized context json', () => {
    const huge = {
      models: {
        'model-a': {
          logExcerpt: 'x'.repeat(50_000),
        },
      },
    };

    const serialized = truncateContextJson(huge, 4096);
    expect(Buffer.byteLength(serialized, 'utf8')).toBeLessThanOrEqual(4096);
  });

  it('builds triage user prompt with suite header', () => {
    const prompt = buildTriageUserPrompt(
      { models: { 'eis-gpt-4.1': { logExcerpt: 'timeout' } } },
      {
        suiteName: 'Agent Builder',
        suiteId: 'agent-builder',
        buildUrl: 'https://buildkite.com/build/1',
        buildId: 'build-1',
        failingProjects: ['eis-gpt-4.1'],
      }
    );

    expect(prompt).toContain('Agent Builder');
    expect(prompt).toContain('eis-gpt-4.1');
    expect(prompt).toContain('timeout');
  });

  it('grounds the triage prompt in the log excerpts and asks for verifiable evidence', () => {
    const prompt = buildTriageUserPrompt(
      { models: {} },
      { suiteName: 'Streams', suiteId: 'streams', failingProjects: ['eis-gpt-5.4'] }
    );

    expect(prompt).toContain('using only the run-log excerpts');
    expect(prompt).toContain('Quote the most relevant error line(s)');
    expect(prompt).toContain('do not show a clear cause, say so');
    expect(prompt).not.toContain('regression');
  });

  describe('extractSuiteRootCauseLine', () => {
    it('returns the first meaningful triage line after the header', () => {
      const triageBody = [
        ':rotating_light: *Weekly LLM evals* — Streams (`streams`) failed.',
        '',
        '*Failing models:*',
        '- `eis/openai-gpt-5.4`',
        '',
        '<https://buildkite.com/build/1|View build>',
        '',
        '*Triage summary (model: `litellm-llm-gateway-gpt-4o`):*',
        '• Likely provider issue (not actionable): gpt-5.4 returned 529 overloaded.',
        '• Other models passed.',
      ].join('\n');

      expect(extractSuiteRootCauseLine(triageBody)).toBe(
        'Likely provider issue (not actionable): gpt-5.4 returned 529 overloaded.'
      );
    });

    it('skips headers and model bullets when there is no triage header', () => {
      const triageBody = [
        ':rotating_light: *Streams* failed.',
        '*Failing models:*',
        '- `eis/openai-gpt-5.4`',
        'Eval regression: partition score dropped to 0.42.',
      ].join('\n');

      expect(extractSuiteRootCauseLine(triageBody)).toBe(
        'Eval regression: partition score dropped to 0.42.'
      );
    });

    it('returns an empty string for empty input', () => {
      expect(extractSuiteRootCauseLine('')).toBe('');
      expect(extractSuiteRootCauseLine(undefined)).toBe('');
    });

    it('truncates long root-cause lines', () => {
      const line = `x`.repeat(500);
      expect(extractSuiteRootCauseLine(line, 50).length).toBeLessThanOrEqual(50);
    });
  });

  describe('buildWeeklyRollupUserPrompt', () => {
    const suites = [
      {
        suiteId: 'streams',
        suiteName: 'Streams',
        failingProjects: ['eis-claude-4.6-sonnet', 'eis-gemini-3.1-pro'],
        triageBody: 'Eval regression: partition score dropped.',
      },
      {
        suiteId: 'observability-ai',
        suiteName: 'Observability AI',
        failingProjects: ['eis-gpt-5.4'],
        triageBody: 'Provider issue: 529 overloaded.',
      },
    ];

    it('includes each failing suite, its models, and its triage body', () => {
      const prompt = buildWeeklyRollupUserPrompt(suites, {
        buildUrl: 'https://buildkite.com/build/9',
      });

      expect(prompt).toContain('Failing suites: 2');
      expect(prompt).toContain('Streams (streams)');
      expect(prompt).toContain('eis-claude-4.6-sonnet, eis-gemini-3.1-pro');
      expect(prompt).toContain('Observability AI (observability-ai)');
      expect(prompt).toContain('Provider issue: 529 overloaded.');
      expect(prompt).toContain('https://buildkite.com/build/9');
    });
  });

  it('builds LiteLLM chat request from connector config', () => {
    const request = buildLitellmChatRequest(
      {
        config: {
          apiUrl: 'https://litellm.example/v1/chat/completions',
          defaultModel: 'llm-gateway/gpt-4o',
        },
        secrets: { apiKey: 'sk-test' },
      },
      [{ role: 'user', content: 'hello' }]
    );

    expect(request.url).toBe('https://litellm.example/v1/chat/completions');
    expect(request.headers.authorization).toBe('Bearer sk-test');
    expect(request.body.model).toBe('llm-gateway/gpt-4o');
    expect(request.body.messages).toEqual([{ role: 'user', content: 'hello' }]);
  });

  it('parses LiteLLM chat completion content', () => {
    expect(
      parseLitellmChatContent({
        choices: [{ message: { content: 'Provider rate limited several models.' } }],
      })
    ).toBe('Provider rate limited several models.');
  });

  it('maps litellm connector ids to model groups', () => {
    expect(connectorIdToLitellmModel('litellm-llm-gateway-gpt-4o')).toBe('llm-gateway/gpt-4o');
  });

  it('builds litellm connector from vault config', () => {
    const previousConfig = process.env.KBN_EVALS_CONFIG_B64;
    process.env.KBN_EVALS_CONFIG_B64 = Buffer.from(
      JSON.stringify({
        evaluationConnectorId: 'litellm-llm-gateway-gpt-4o',
        litellm: {
          baseUrl: 'https://litellm.example',
          virtualKey: 'sk-test',
        },
      }),
      'utf8'
    ).toString('base64');

    const connector = buildLitellmConnectorFromVault('litellm-llm-gateway-gpt-4o');
    expect(connector.config.apiUrl).toBe('https://litellm.example/v1/chat/completions');
    expect(connector.config.defaultModel).toBe('llm-gateway/gpt-4o');
    expect(connector.secrets.apiKey).toBe('sk-test');

    if (previousConfig) {
      process.env.KBN_EVALS_CONFIG_B64 = previousConfig;
    } else {
      delete process.env.KBN_EVALS_CONFIG_B64;
    }
  });

  it('builds litellm connector from LITELLM env vars', () => {
    const previousConfig = process.env.KBN_EVALS_CONFIG_B64;
    const previousBaseUrl = process.env.LITELLM_BASE_URL;
    const previousKey = process.env.LITELLM_VIRTUAL_KEY;
    delete process.env.KBN_EVALS_CONFIG_B64;
    process.env.LITELLM_BASE_URL = 'https://litellm.example';
    process.env.LITELLM_VIRTUAL_KEY = 'sk-env';

    const connector = buildLitellmConnectorFromVault('litellm-llm-gateway-gpt-4o');
    expect(connector.config.apiUrl).toBe('https://litellm.example/v1/chat/completions');
    expect(connector.secrets.apiKey).toBe('sk-env');

    if (previousConfig) {
      process.env.KBN_EVALS_CONFIG_B64 = previousConfig;
    }
    if (previousBaseUrl) {
      process.env.LITELLM_BASE_URL = previousBaseUrl;
    } else {
      delete process.env.LITELLM_BASE_URL;
    }
    if (previousKey) {
      process.env.LITELLM_VIRTUAL_KEY = previousKey;
    } else {
      delete process.env.LITELLM_VIRTUAL_KEY;
    }
  });

  describe('resolveTriageModelId', () => {
    let previousOverride;

    beforeEach(() => {
      previousOverride = process.env.EVAL_TRIAGE_MODEL_ID;
      delete process.env.EVAL_TRIAGE_MODEL_ID;
    });

    afterEach(() => {
      if (previousOverride === undefined) {
        delete process.env.EVAL_TRIAGE_MODEL_ID;
      } else {
        process.env.EVAL_TRIAGE_MODEL_ID = previousOverride;
      }
    });

    it('prefers the EVAL_TRIAGE_MODEL_ID override', () => {
      process.env.EVAL_TRIAGE_MODEL_ID = 'litellm-llm-gateway-claude-4';

      expect(resolveTriageModelId()).toBe('litellm-llm-gateway-claude-4');
    });

    it('falls back to the default triage model id', () => {
      expect(resolveTriageModelId()).toBe(DEFAULT_TRIAGE_MODEL_ID);
    });
  });
});
