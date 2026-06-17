/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const {
  failureLogMetadataKey,
  buildFailureScoresQuery,
  groupLowScoresByRunId,
  expectedRunId,
  truncateContextJson,
  buildTriageUserPrompt,
  buildWeeklyRollupUserPrompt,
  extractSuiteRootCauseLine,
  buildLitellmChatRequest,
  connectorIdToLitellmModel,
  buildLitellmConnectorFromVault,
  evaluationConnectorMetadataKey,
  resolveEvaluationConnectorId,
  parseLitellmChatContent,
  resolveTriageJudgeId,
  listLitellmConnectorIds,
  DEFAULT_TRIAGE_JUDGE_ID,
} = require('./failure_context_helpers');

const encodeConnectors = (connectors) =>
  Buffer.from(JSON.stringify(connectors), 'utf8').toString('base64');

describe('failure_context_helpers', () => {
  it('builds failure log metadata keys', () => {
    expect(failureLogMetadataKey('Observability AI', 'eis-gpt-4.1')).toBe(
      'kbn-evals:suite-failure-log:observability-ai:eis-gpt-4-1'
    );
  });

  it('builds ES query for build and suite', () => {
    expect(buildFailureScoresQuery('build-123', 'agent-builder')).toEqual({
      bool: {
        must: [
          { term: { 'ci.buildkite.build_id': 'build-123' } },
          { term: { 'suite.id': 'agent-builder' } },
        ],
      },
    });
  });

  it('groups lowest scores per run id', () => {
    const grouped = groupLowScoresByRunId(
      [
        {
          _source: {
            run_id: 'bk-1-eis-gpt-4.1',
            example: { id: 'ex-1', dataset: { name: 'ds-a' } },
            evaluator: { name: 'Correctness', score: 0.2, explanation: 'bad answer' },
            task: { model: { id: 'eis-gpt-4.1' } },
          },
        },
        {
          _source: {
            run_id: 'bk-1-eis-gpt-4.1',
            example: { id: 'ex-2', dataset: { name: 'ds-a' } },
            evaluator: { name: 'Correctness', score: 0.9, explanation: 'good' },
            task: { model: { id: 'eis-gpt-4.1' } },
          },
        },
      ],
      { maxRowsPerModel: 1 }
    );

    expect(grouped['bk-1-eis-gpt-4.1'].lowScores).toHaveLength(1);
    expect(grouped['bk-1-eis-gpt-4.1'].lowScores[0].score).toBe(0.2);
  });

  it('formats expected run ids', () => {
    expect(expectedRunId('build-9', 'eis-claude')).toBe('bk-build-9-eis-claude');
  });

  it('truncates oversized context json', () => {
    const huge = {
      models: {
        'model-a': {
          logExcerpt: 'x'.repeat(50_000),
          lowScores: [{ explanation: 'y'.repeat(10_000), score: 0 }],
        },
      },
    };

    const serialized = truncateContextJson(huge, 4096);
    expect(Buffer.byteLength(serialized, 'utf8')).toBeLessThanOrEqual(4096);
  });

  it('builds triage user prompt with suite header', () => {
    const prompt = buildTriageUserPrompt(
      { models: { 'eis-gpt-4.1': { hasScoreData: false, logExcerpt: 'timeout' } } },
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

  it('asks the triage prompt to classify provider vs regression vs test bug', () => {
    const prompt = buildTriageUserPrompt(
      { models: {} },
      { suiteName: 'Streams', suiteId: 'streams', failingProjects: ['eis-gpt-5.4'] }
    );

    expect(prompt).toContain('provider/infra issue');
    expect(prompt).toContain('eval-quality regression');
    expect(prompt).toContain('test/harness bug');
    expect(prompt).toContain('multiple unrelated providers/models');
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
        '*Triage summary (judge: `litellm-llm-gateway-gpt-4o`):*',
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
        totalSuites: 15,
      });

      expect(prompt).toContain('Failing suites: 2 of 15');
      expect(prompt).toContain('Streams (streams)');
      expect(prompt).toContain('eis-claude-4.6-sonnet, eis-gemini-3.1-pro');
      expect(prompt).toContain('Observability AI (observability-ai)');
      expect(prompt).toContain('Provider issue: 529 overloaded.');
      expect(prompt).toContain('https://buildkite.com/build/9');
    });

    it('omits the total-suite count when not provided', () => {
      const prompt = buildWeeklyRollupUserPrompt(suites);
      expect(prompt).toContain('Failing suites: 2');
      expect(prompt).not.toContain(' of ');
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

  it('prefers EVALUATION_CONNECTOR_ID env over vault (same as eval LLM-as-a-judge)', () => {
    const previousConfig = process.env.KBN_EVALS_CONFIG_B64;
    const previousEnv = process.env.EVALUATION_CONNECTOR_ID;
    const previousSuiteId = process.env.EVAL_SUITE_ID;
    delete process.env.EVAL_SUITE_ID;
    process.env.EVALUATION_CONNECTOR_ID = 'eis-openai-gpt-5-4';
    process.env.KBN_EVALS_CONFIG_B64 = Buffer.from(
      JSON.stringify({ evaluationConnectorId: 'litellm-llm-gateway-gpt-4o' }),
      'utf8'
    ).toString('base64');

    expect(resolveEvaluationConnectorId()).toBe('eis-openai-gpt-5-4');

    if (previousConfig) {
      process.env.KBN_EVALS_CONFIG_B64 = previousConfig;
    } else {
      delete process.env.KBN_EVALS_CONFIG_B64;
    }
    if (previousEnv) {
      process.env.EVALUATION_CONNECTOR_ID = previousEnv;
    } else {
      delete process.env.EVALUATION_CONNECTOR_ID;
    }
    if (previousSuiteId) {
      process.env.EVAL_SUITE_ID = previousSuiteId;
    } else {
      delete process.env.EVAL_SUITE_ID;
    }
  });

  it('builds evaluation connector metadata key', () => {
    expect(evaluationConnectorMetadataKey('observability-ai')).toBe(
      'kbn-evals:evaluation-connector-id:observability-ai'
    );
  });

  it('resolves evaluation connector id from build metadata before vault', () => {
    const previousConfig = process.env.KBN_EVALS_CONFIG_B64;
    const previousEnv = process.env.EVALUATION_CONNECTOR_ID;
    const previousSuiteId = process.env.EVAL_SUITE_ID;
    delete process.env.EVALUATION_CONNECTOR_ID;
    process.env.EVAL_SUITE_ID = 'agent-builder';
    process.env.KBN_EVALS_CONFIG_B64 = Buffer.from(
      JSON.stringify({ evaluationConnectorId: 'litellm-llm-gateway-gpt-4o' }),
      'utf8'
    ).toString('base64');

    expect(
      resolveEvaluationConnectorId({
        readMetadata: (key) =>
          key === 'kbn-evals:evaluation-connector-id:agent-builder'
            ? 'litellm-llm-gateway-claude-4'
            : '',
      })
    ).toBe('litellm-llm-gateway-claude-4');

    if (previousConfig) {
      process.env.KBN_EVALS_CONFIG_B64 = previousConfig;
    } else {
      delete process.env.KBN_EVALS_CONFIG_B64;
    }
    if (previousEnv) {
      process.env.EVALUATION_CONNECTOR_ID = previousEnv;
    }
    if (previousSuiteId) {
      process.env.EVAL_SUITE_ID = previousSuiteId;
    } else {
      delete process.env.EVAL_SUITE_ID;
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

  it('resolves evaluation connector id from vault config', () => {
    const previousConfig = process.env.KBN_EVALS_CONFIG_B64;
    const previousEnv = process.env.EVALUATION_CONNECTOR_ID;
    const previousSuiteId = process.env.EVAL_SUITE_ID;
    delete process.env.EVALUATION_CONNECTOR_ID;
    delete process.env.EVAL_SUITE_ID;
    process.env.KBN_EVALS_CONFIG_B64 = Buffer.from(
      JSON.stringify({ evaluationConnectorId: 'litellm-llm-gateway-gpt-4o' }),
      'utf8'
    ).toString('base64');

    expect(resolveEvaluationConnectorId({ readMetadata: () => '' })).toBe(
      'litellm-llm-gateway-gpt-4o'
    );

    if (previousConfig) {
      process.env.KBN_EVALS_CONFIG_B64 = previousConfig;
    } else {
      delete process.env.KBN_EVALS_CONFIG_B64;
    }
    if (previousEnv) {
      process.env.EVALUATION_CONNECTOR_ID = previousEnv;
    }
    if (previousSuiteId) {
      process.env.EVAL_SUITE_ID = previousSuiteId;
    }
  });

  describe('resolveTriageJudgeId', () => {
    const ENV_KEYS = [
      'EVAL_TRIAGE_JUDGE_ID',
      'EVALUATION_CONNECTOR_ID',
      'EVAL_SUITE_ID',
      'KBN_EVALS_CONFIG_B64',
      'KIBANA_TESTING_AI_CONNECTORS',
    ];

    const noMetadata = { readMetadata: () => '' };
    let previousEnv;

    beforeEach(() => {
      previousEnv = {};
      for (const key of ENV_KEYS) {
        previousEnv[key] = process.env[key];
        delete process.env[key];
      }
    });

    afterEach(() => {
      for (const key of ENV_KEYS) {
        if (previousEnv[key] === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = previousEnv[key];
        }
      }
    });

    it('prefers the EVAL_TRIAGE_JUDGE_ID override', () => {
      process.env.EVAL_TRIAGE_JUDGE_ID = 'litellm-llm-gateway-claude-4';
      process.env.EVALUATION_CONNECTOR_ID = 'eis-google-gemini-2-5-flash';

      expect(resolveTriageJudgeId(noMetadata)).toBe('litellm-llm-gateway-claude-4');
    });

    it('uses the eval judge when it is already LiteLLM-backed', () => {
      process.env.EVALUATION_CONNECTOR_ID = 'litellm-llm-gateway-gpt-4o';

      expect(resolveTriageJudgeId(noMetadata)).toBe('litellm-llm-gateway-gpt-4o');
    });

    it('uses the default LiteLLM judge when it is among available connectors', () => {
      process.env.EVALUATION_CONNECTOR_ID = 'eis-google-gemini-2-5-flash';
      process.env.KIBANA_TESTING_AI_CONNECTORS = encodeConnectors({
        'litellm-llm-gateway-claude-4': { config: {} },
        [DEFAULT_TRIAGE_JUDGE_ID]: { config: {} },
        'eis-google-gemini-2-5-flash': { config: {} },
      });

      expect(resolveTriageJudgeId(noMetadata)).toBe(DEFAULT_TRIAGE_JUDGE_ID);
    });

    it('falls back to the first available LiteLLM connector for an EIS eval judge', () => {
      process.env.EVALUATION_CONNECTOR_ID = 'eis-google-gemini-2-5-flash';
      process.env.KIBANA_TESTING_AI_CONNECTORS = encodeConnectors({
        'litellm-llm-gateway-zeta': { config: {} },
        'litellm-llm-gateway-alpha': { config: {} },
        'eis-google-gemini-2-5-flash': { config: {} },
      });

      expect(resolveTriageJudgeId(noMetadata)).toBe('litellm-llm-gateway-alpha');
    });

    it('uses the vault LiteLLM judge when no connectors are available', () => {
      process.env.EVALUATION_CONNECTOR_ID = 'eis-google-gemini-2-5-flash';
      process.env.KBN_EVALS_CONFIG_B64 = Buffer.from(
        JSON.stringify({ evaluationConnectorId: 'litellm-llm-gateway-vault-model' }),
        'utf8'
      ).toString('base64');

      expect(resolveTriageJudgeId(noMetadata)).toBe('litellm-llm-gateway-vault-model');
    });

    it('falls back to the default triage judge id when nothing else resolves', () => {
      process.env.EVALUATION_CONNECTOR_ID = 'eis-google-gemini-2-5-flash';

      expect(resolveTriageJudgeId(noMetadata)).toBe(DEFAULT_TRIAGE_JUDGE_ID);
    });

    it('lists only LiteLLM connector ids, sorted', () => {
      process.env.KIBANA_TESTING_AI_CONNECTORS = encodeConnectors({
        'litellm-llm-gateway-zeta': { config: {} },
        'eis-google-gemini-2-5-flash': { config: {} },
        'litellm-llm-gateway-alpha': { config: {} },
      });

      expect(listLitellmConnectorIds()).toEqual([
        'litellm-llm-gateway-alpha',
        'litellm-llm-gateway-zeta',
      ]);
    });
  });
});
