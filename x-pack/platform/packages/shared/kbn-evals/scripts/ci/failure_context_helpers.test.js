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
  buildLitellmChatRequest,
  resolveEvaluationConnectorId,
  buildEisChatRequest,
  parseEisStreamResponse,
  parseLitellmChatContent,
} = require('./failure_context_helpers');

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

  it('resolves evaluation connector id from vault config', () => {
    const previousConfig = process.env.KBN_EVALS_CONFIG_B64;
    const previousEnv = process.env.EVALUATION_CONNECTOR_ID;
    delete process.env.EVALUATION_CONNECTOR_ID;
    process.env.KBN_EVALS_CONFIG_B64 = Buffer.from(
      JSON.stringify({ evaluationConnectorId: 'litellm-llm-gateway-gpt-4o' }),
      'utf8'
    ).toString('base64');

    expect(resolveEvaluationConnectorId()).toBe('litellm-llm-gateway-gpt-4o');

    if (previousConfig) {
      process.env.KBN_EVALS_CONFIG_B64 = previousConfig;
    } else {
      delete process.env.KBN_EVALS_CONFIG_B64;
    }
    if (previousEnv) {
      process.env.EVALUATION_CONNECTOR_ID = previousEnv;
    }
  });

  it('builds EIS chat request and parses stream chunks', () => {
    const request = buildEisChatRequest(
      {
        config: { inferenceId: '.rainbow-elastic' },
      },
      [{ role: 'user', content: 'summarize failures' }],
      'https://es.example:443',
      'api-key'
    );

    expect(request.url).toContain('/_inference/chat_completion/.rainbow-elastic/_stream');
    expect(request.headers.authorization).toBe('ApiKey api-key');

    const summary = parseEisStreamResponse(
      '{"choices":[{"delta":{"content":"Provider "}}]}\n{"choices":[{"delta":{"content":"timeout"}}]}\n'
    );
    expect(summary).toBe('Provider timeout');
  });
});
