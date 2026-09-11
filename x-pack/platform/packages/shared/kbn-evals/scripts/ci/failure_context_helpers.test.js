/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const {
  failureLogMetadataKey,
  failureLogMetadataKeysForProject,
  TRIAGE_OPENROUTER_CONNECTOR_ID,
  TRIAGE_TOOL_NAME,
  TRIAGE_TOOL,
  TRIAGE_TOOL_CHOICE,
  TRIAGE_MAX_TOKENS,
  DEFAULT_MAX_TOKENS,
  resolveTriageConnector,
  buildOpenrouterChatRequest,
  buildTriageUserPrompt,
  parseTriageGroups,
  parseTriageToolCall,
  runTriageModelStructured,
  runTriageModel,
} = require('./failure_context_helpers');

const SUITE = 'significant-events';

const CONNECTOR = {
  config: { apiUrl: 'https://openrouter.test/api/v1/chat/completions', defaultModel: 'test/model' },
  secrets: { apiKey: 'sk-test' },
};

const MESSAGES = [
  { role: 'system', content: 'system' },
  { role: 'user', content: 'user' },
];

const GROUP = {
  error: 'Error: expect(received).toBe(expected)',
  location: 'find_rules.spec.ts:484',
  models: ['eis-openai-gpt-5-4'],
  rootCause: 'Assertion failed; update the expectation.',
};

function toolCallResponse(args, { finishReason = 'tool_calls', name = TRIAGE_TOOL_NAME } = {}) {
  return {
    choices: [
      {
        finish_reason: finishReason,
        message: {
          role: 'assistant',
          content: null,
          tool_calls: [{ id: 'call_1', type: 'function', function: { name, arguments: args } }],
        },
      },
    ],
  };
}

function textResponse(content, finishReason = 'stop') {
  return { choices: [{ finish_reason: finishReason, message: { role: 'assistant', content } }] };
}

function mockFetchJson(json) {
  return jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(json)),
  });
}

describe('failureLogMetadataKey', () => {
  it('slugifies the suite and project into a stable key', () => {
    expect(failureLogMetadataKey(SUITE, 'eis/openai-gpt-5.4')).toBe(
      'kbn-evals:suite-failure-log:significant-events:eis-openai-gpt-5-4'
    );
  });
});

describe('failureLogMetadataKeysForProject', () => {
  const base = failureLogMetadataKey(SUITE, 'gpt-5');

  it('returns only the unsharded key when no shard keys were recorded', () => {
    expect(failureLogMetadataKeysForProject([], SUITE, 'gpt-5')).toEqual([base]);
  });

  it('returns the unsharded key first, then the shard keys in a stable order', () => {
    const keys = [
      `${base}:features`,
      'kbn-evals:suite-failures:significant-events:gpt-5',
      `${base}:discovery-and-queries`,
      base,
    ];

    expect(failureLogMetadataKeysForProject(keys, SUITE, 'gpt-5')).toEqual([
      base,
      `${base}:discovery-and-queries`,
      `${base}:features`,
    ]);
  });

  it('does not bleed shards of a model whose slug is a prefix of another model', () => {
    const miniBase = failureLogMetadataKey(SUITE, 'gpt-5-mini');
    const keys = [`${base}:features`, `${miniBase}:features`];

    expect(failureLogMetadataKeysForProject(keys, SUITE, 'gpt-5')).toEqual([
      base,
      `${base}:features`,
    ]);
    expect(failureLogMetadataKeysForProject(keys, SUITE, 'gpt-5-mini')).toEqual([
      miniBase,
      `${miniBase}:features`,
    ]);
  });
});

describe('buildOpenrouterChatRequest', () => {
  it('builds a plain text request by default (weekly rollup path)', () => {
    const { url, headers, body } = buildOpenrouterChatRequest(CONNECTOR, MESSAGES);

    expect(url).toBe(CONNECTOR.config.apiUrl);
    expect(headers.authorization).toBe('Bearer sk-test');
    expect(body).toEqual({
      model: 'test/model',
      messages: MESSAGES,
      temperature: 0.2,
      max_tokens: DEFAULT_MAX_TOKENS,
    });
    expect(body).not.toHaveProperty('tools');
    expect(body).not.toHaveProperty('tool_choice');
  });

  it('adds the tool, forced tool choice, and a larger token budget when asked', () => {
    const { body } = buildOpenrouterChatRequest(CONNECTOR, MESSAGES, {
      maxTokens: TRIAGE_MAX_TOKENS,
      tools: [TRIAGE_TOOL],
      toolChoice: TRIAGE_TOOL_CHOICE,
    });

    expect(body.max_tokens).toBe(TRIAGE_MAX_TOKENS);
    expect(body.tools).toEqual([TRIAGE_TOOL]);
    expect(body.tool_choice).toEqual({
      type: 'function',
      function: { name: TRIAGE_TOOL_NAME },
    });
  });

  it('throws when the connector is incomplete', () => {
    expect(() => buildOpenrouterChatRequest({ config: {}, secrets: {} }, MESSAGES)).toThrow(
      'OpenRouter connector is missing apiUrl, defaultModel, or apiKey'
    );
  });
});

describe('buildTriageUserPrompt', () => {
  it('asks the model to report through the triage tool and bounds the output', () => {
    const prompt = buildTriageUserPrompt(
      { suiteId: SUITE, failingProjects: ['gpt-5'], models: {} },
      { suiteName: 'Significant Events', suiteId: SUITE, failingProjects: ['gpt-5'] }
    );

    expect(prompt).toContain(`calling the \`${TRIAGE_TOOL_NAME}\` tool`);
    expect(prompt).toContain('Report at most 6 groups');
    expect(prompt).toContain('at most 200 characters');
    expect(prompt).not.toContain('Return ONLY a JSON object');
  });
});

describe('parseTriageGroups', () => {
  it('parses a clean JSON object', () => {
    expect(parseTriageGroups(JSON.stringify({ groups: [GROUP] }))).toEqual([GROUP]);
  });

  it('strips a markdown code fence', () => {
    expect(parseTriageGroups(`\`\`\`json\n${JSON.stringify({ groups: [GROUP] })}\n\`\`\``)).toEqual(
      [GROUP]
    );
  });

  it('recovers the object when the model wraps it in prose', () => {
    const raw = `Here is the triage:\n${JSON.stringify({
      groups: [GROUP],
    })}\nLet me know if you need more.`;
    expect(parseTriageGroups(raw)).toEqual([GROUP]);
  });

  it('coerces loose field types and drops empty groups', () => {
    const raw = JSON.stringify({
      groups: [
        { error: ' boom ', models: 'not-an-array', rootCause: 42 },
        { error: '', location: 'x', models: [], rootCause: '' },
      ],
    });
    expect(parseTriageGroups(raw)).toEqual([
      { error: 'boom', location: '', models: [], rootCause: '42' },
    ]);
  });

  it('returns no groups when "groups" is missing', () => {
    expect(parseTriageGroups('{}')).toEqual([]);
  });

  it('throws a short message and keeps a redacted preview of the raw output in details', () => {
    const raw = `{"groups":[{"error":"Authorization: Bearer abc.def.ghi failed","models":["gpt-5"`;
    let caught;
    try {
      parseTriageGroups(raw);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    expect(caught.message).toBe('Triage model did not return valid JSON');
    expect(caught.details).toContain('Raw model output');
    expect(caught.details).toContain('[REDACTED]');
    expect(caught.details).not.toContain('abc.def.ghi');
  });

  it('clips the raw preview to 300 characters', () => {
    const raw = `{${'x'.repeat(1000)}`;
    let caught;
    try {
      parseTriageGroups(raw);
    } catch (error) {
      caught = error;
    }

    expect(caught.details).toContain('(1001 chars)');
    expect(caught.details.length).toBeLessThan(400);
    expect(caught.details.endsWith('…')).toBe(true);
  });
});

describe('parseTriageToolCall', () => {
  it('reads the groups from the forced tool call arguments', () => {
    const response = toolCallResponse(JSON.stringify({ groups: [GROUP] }));
    expect(parseTriageToolCall(response)).toEqual([GROUP]);
  });

  it('accepts providers that inline the arguments as an object', () => {
    const response = toolCallResponse({ groups: [GROUP] });
    expect(parseTriageToolCall(response)).toEqual([GROUP]);
  });

  it('prefers the report_triage call when several tool calls are present', () => {
    const response = toolCallResponse(JSON.stringify({ groups: [GROUP] }));
    response.choices[0].message.tool_calls.unshift({
      id: 'call_0',
      type: 'function',
      function: { name: 'other_tool', arguments: '{"groups":[]}' },
    });
    expect(parseTriageToolCall(response)).toEqual([GROUP]);
  });

  it('reports truncation at the token limit instead of a generic JSON error', () => {
    const response = toolCallResponse('{"groups":[{"error":"boom","mo', { finishReason: 'length' });
    let caught;
    try {
      parseTriageToolCall(response);
    } catch (error) {
      caught = error;
    }

    expect(caught.message).toBe(
      `Triage model output was truncated at the ${TRIAGE_MAX_TOKENS}-token limit`
    );
    expect(caught.details).toContain('{"groups":[{"error":"boom","mo');
  });

  it('reports a missing tool call when the model answered in text', () => {
    let caught;
    try {
      parseTriageToolCall(textResponse('Sure! Here is my analysis of the failures...'));
    } catch (error) {
      caught = error;
    }

    expect(caught.message).toBe(
      `Triage model did not call the ${TRIAGE_TOOL_NAME} tool (finish_reason: stop)`
    );
    expect(caught.details).toContain('Sure! Here is my analysis');
  });

  it('reports malformed tool arguments as invalid JSON with a preview', () => {
    let caught;
    try {
      parseTriageToolCall(toolCallResponse('not json at all'));
    } catch (error) {
      caught = error;
    }

    expect(caught.message).toBe('Triage model did not return valid JSON');
    expect(caught.details).toContain('not json at all');
  });

  it('rejects a non-object response', () => {
    expect(() => parseTriageToolCall(null)).toThrow('OpenRouter response was not JSON');
  });
});

describe('runTriageModelStructured / runTriageModel (mocked fetch)', () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.OPENROUTER_BASE_URL = 'https://openrouter.test/api/v1';
    process.env.OPENROUTER_API_KEY = 'sk-test';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
  });

  it('sends the tool-forced request and returns the parsed groups', async () => {
    global.fetch = mockFetchJson(toolCallResponse(JSON.stringify({ groups: [GROUP] })));

    const result = await runTriageModelStructured('triage this');

    expect(result).toEqual({ groups: [GROUP], modelId: TRIAGE_OPENROUTER_CONNECTOR_ID });
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe('https://openrouter.test/api/v1/chat/completions');
    const body = JSON.parse(init.body);
    expect(body.max_tokens).toBe(TRIAGE_MAX_TOKENS);
    expect(body.tools).toEqual([TRIAGE_TOOL]);
    expect(body.tool_choice).toEqual(TRIAGE_TOOL_CHOICE);
    expect(body.messages[1]).toEqual({ role: 'user', content: 'triage this' });
  });

  it('surfaces a truncated reply as a token-limit error', async () => {
    global.fetch = mockFetchJson(toolCallResponse('{"groups":[', { finishReason: 'length' }));

    await expect(runTriageModelStructured('triage this')).rejects.toThrow(
      'truncated at the 4000-token limit'
    );
  });

  it('keeps the weekly rollup on the plain text request', async () => {
    global.fetch = mockFetchJson(textResponse('- Overall: 1 suite likely retryable.'));

    const result = await runTriageModel('summarize');

    expect(result.summary).toBe('- Overall: 1 suite likely retryable.');
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.max_tokens).toBe(DEFAULT_MAX_TOKENS);
    expect(body).not.toHaveProperty('tools');
    expect(body).not.toHaveProperty('tool_choice');
  });
});

describe('resolveTriageConnector', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    delete process.env.OPENROUTER_BASE_URL;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.KBN_EVALS_CONFIG_B64;
    delete process.env.KIBANA_TESTING_AI_CONNECTORS;
  });

  it('builds from vault credentials with the pinned native id, ignoring generated connectors', () => {
    process.env.OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
    process.env.OPENROUTER_API_KEY = 'sk-test';
    process.env.KIBANA_TESTING_AI_CONNECTORS = Buffer.from(
      JSON.stringify({
        [TRIAGE_OPENROUTER_CONNECTOR_ID]: {
          config: {
            apiUrl: 'https://example.invalid/chat',
            defaultModel: 'google/gemini-3.7-flash-stale',
          },
          secrets: { apiKey: 'sk-generated' },
        },
      }),
      'utf8'
    ).toString('base64');

    const { connector, modelId } = resolveTriageConnector();

    expect(modelId).toBe('openrouter-google-gemini-3-7-flash');
    expect(connector.config.defaultModel).toBe('google/gemini-3.7-flash');
    expect(connector.secrets.apiKey).toBe('sk-test');
  });
});
