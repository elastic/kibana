/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'node:stream';
import { toArray, firstValueFrom } from 'rxjs';
import {
  buildInferenceErrorMessage,
  eventSourceStreamIntoObservable,
  truncateUpstreamBody,
} from './helpers';

// Fixtures for credentials that carry no key (or a key the sensitive-key lists did not cover) and
// would otherwise reach logs and error messages verbatim.
const SIGV4_SIGNATURE = 'fe5f80f77d5fa3beca038a248ff027d0445342fe2855ddc963176630326f1024';
const AWS_ACCESS_KEY_ID = 'AKIAIOSFODNN7EXAMPLE';
const SLACK_TOKEN = 'xoxb-123456789012-098765432109-AbCdEfGhIjKlMnOpQrStUvWx';
const BARE_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
const AZURE_SUBSCRIPTION_KEY = '0123456789abcdef0123456789abcdef';
const GITHUB_TOKEN = `ghp_${'a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8'}`;
const GOOGLE_OAUTH_TOKEN = `ya29.${'a0AfH6SMBx0ZQqT9LrF1kD2mN3pQ4rS5tU6vW7xY'}`;
const GOOGLE_API_KEY = `AIza${'SyD1234567890abcdefGHIJKLMNOPQRSTUV'}`;
const HF_TOKEN = `hf_${'aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789'}`;
const GITHUB_PAT = `github_pat_${'11ABCDEFG0aBcDeFgHiJk_lMnOpQrStUvWxYz0123456789aBcDeFgHiJkLmNoPqRsTuVwXyZ'}`;
const SLACK_APP_TOKEN = `xapp-1-A0123456789-0123456789012-${'abcdef0123456789abcdef0123456789'}`;
const PEM_BODY_LINE = 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7zZ0ZQ1yQ';
const PEM_BLOCK = `-----BEGIN PRIVATE KEY-----\n${PEM_BODY_LINE}\n-----END PRIVATE KEY-----`;
const AWS_SECRET_KEY = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';

describe('eventSourceStreamIntoObservable', () => {
  it('emits SSE events from the stream', async () => {
    const messages = [JSON.stringify({ foo: 'bar' }), '42'];
    const stream = Readable.from(messages.map((message) => `data: ${message}\n\n`));

    const results = await firstValueFrom(eventSourceStreamIntoObservable(stream).pipe(toArray()));

    expect(results).toEqual(messages);
  });

  it('destroys the underlying stream when the subscriber unsubscribes', () => {
    const stream = new Readable({ read: () => {} });

    const subscription = eventSourceStreamIntoObservable(stream).subscribe();
    expect(stream.destroyed).toBe(false);

    subscription.unsubscribe();
    expect(stream.destroyed).toBe(true);
  });

  it('destroys the stream and errors the subscriber when maxDurationMs is exceeded', async () => {
    jest.useFakeTimers();
    try {
      const stream = new Readable({ read: () => {} });

      const error$ = new Promise<unknown>((resolve) => {
        eventSourceStreamIntoObservable(stream, { maxDurationMs: 1_000 }).subscribe({
          error: resolve,
        });
      });

      jest.advanceTimersByTime(1_001);

      const error = await error$;
      expect(stream.destroyed).toBe(true);
      expect(error).toEqual(
        expect.objectContaining({
          message: expect.stringContaining('maximum allowed duration'),
        })
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('enforces the deadline in-band when the timers phase is starved', async () => {
    const start = Date.now();
    const nowSpy = jest.spyOn(Date, 'now');
    try {
      const stream = new Readable({ read: () => {} });

      const error$ = new Promise<unknown>((resolve) => {
        eventSourceStreamIntoObservable(stream, { maxDurationMs: 60_000 }).subscribe({
          error: resolve,
        });
      });

      // advance time without letting any timer fire
      nowSpy.mockReturnValue(start + 61_000);
      stream.push('data: too late\n\n');

      const error = await error$;
      expect(stream.destroyed).toBe(true);
      expect(error).toEqual(
        expect.objectContaining({
          message: expect.stringContaining('maximum allowed duration'),
        })
      );
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('propagates errors emitted by the stream itself', async () => {
    const stream = new Readable({ read: () => {} });

    const error$ = new Promise<unknown>((resolve) => {
      eventSourceStreamIntoObservable(stream).subscribe({ error: resolve });
    });

    stream.destroy(new Error('boom'));

    const error = await error$;
    expect(error).toEqual(expect.objectContaining({ message: 'boom' }));
  });
});

describe('truncateUpstreamBody', () => {
  it('returns short strings as-is and stringifies objects', () => {
    expect(truncateUpstreamBody('short')).toBe('short');
    expect(truncateUpstreamBody({ a: 1 })).toBe('{"a":1}');
    expect(truncateUpstreamBody(undefined)).toBe('');
  });

  it('caps long bodies at 1000 chars', () => {
    const result = truncateUpstreamBody('y'.repeat(3000));
    expect(result).toHaveLength(1000);
    expect(result).toContain('... [truncated]');
  });

  it('does not throw on circular structures', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => truncateUpstreamBody(circular)).not.toThrow();
  });

  it('still caps when maxLength is below the truncation marker length', () => {
    const body = 'z'.repeat(50);
    for (const maxLength of [0, 5, 13, 14]) {
      expect(truncateUpstreamBody(body, maxLength)).toHaveLength(maxLength);
    }
    expect(truncateUpstreamBody(body, 5)).toBe('... [');

    const message = buildInferenceErrorMessage({ message: body, statusCode: 500 });
    expect(truncateUpstreamBody(message, 5).length).toBeLessThanOrEqual(5);
  });
});

describe('upstream credential redaction', () => {
  it.each([
    ['Authorization: ApiKey ABC123base64==', 'ABC123base64=='],
    ['{"Authorization":"ApiKey ABC123base64=="}', 'ABC123base64=='],
    ['{"authorization":"Basic dXNlcjpwYXNz"}', 'dXNlcjpwYXNz'],
    ['Authorization: Basic dXNlcjpwYXNz', 'dXNlcjpwYXNz'],
    ['Authorization: Negotiate YWJjZA==', 'YWJjZA=='],
    ['authorization: Digest abc123', 'abc123'],
    ['Bearer eyJhbGciOi.payload.sig', 'eyJhbGciOi.payload.sig'],
    ['sk-abcdefghijklmnop', 'abcdefghijklmnop'],
    ['ES-API-Key: abc123', 'abc123'],
    ['x-api-key: abc123', 'abc123'],
    ['api_key=abc123', 'abc123'],
    ['{"api_key":"abc123"}', 'abc123'],
    ['apikey: abc123', 'abc123'],
    ['api key: abc123', 'abc123'],
    ['password: hunter2', 'hunter2'],
    ['secret: s3cr3t', 's3cr3t'],
    ['client_secret: s3cr3t', 's3cr3t'],
    ['secret_key: abc123', 'abc123'],
    ['aws_secret_access_key: wJalrXUtnFEMI', 'wJalrXUtnFEMI'],
    ['private_key: abc123', 'abc123'],
    ['credential: abc123', 'abc123'],
    ['access_token: abc123', 'abc123'],
    ['refresh_token: abc123', 'abc123'],
    ['{"token":"abc123"}', 'abc123'],
    ['token=abc123', 'abc123'],
    ['error: bad request\ntoken: ZZSECRET9', 'ZZSECRET9'],
    ['Host: x\nToken: ZZSECRET9', 'ZZSECRET9'],
    ['OPENAI_API_KEY=ZZSECRET9', 'ZZSECRET9'],
    ['HF_TOKEN=ZZSECRET9', 'ZZSECRET9'],
    ['api_token: ZZSECRET9', 'ZZSECRET9'],
    ['{"accessToken":"ZZSECRET9"}', 'ZZSECRET9'],
    ['{"clientSecret":"ZZSECRET9"}', 'ZZSECRET9'],
    ['passwd: ZZSECRET9', 'ZZSECRET9'],
    ['connect ECONNREFUSED http://admin:ZZSECRET9@10.0.0.5:8000/v1/chat/completions', 'ZZSECRET9'],
    ['https://user:P%40ssZZSECRET9@gateway.local/v1', 'P%40ssZZSECRET9'],
    ['{"url":"https://u:ZZSECRET9@h/x"}', 'ZZSECRET9'],
    ['{"token":"ZZSECRET9', 'ZZSECRET9'],
    ["{'token':'ZZSECRET9", 'ZZSECRET9'],
    ['{"api_key":"ZZSECRET9', 'ZZSECRET9'],
    ['{"password":"ZZSECRET9', 'ZZSECRET9'],
    // credentials that arrive bare, with no key and no scheme in front of them
    [
      `Authorization: AWS4-HMAC-SHA256 Credential=${AWS_ACCESS_KEY_ID}/20261012/us-east-1/bedrock/aws4_request, SignedHeaders=host;x-amz-date, Signature=${SIGV4_SIGNATURE}`,
      SIGV4_SIGNATURE,
    ],
    [`Signature=${SIGV4_SIGNATURE}`, SIGV4_SIGNATURE],
    [`the request was signed with key ${AWS_ACCESS_KEY_ID}`, AWS_ACCESS_KEY_ID],
    [`Error: request signed for ASIA${'B'.repeat(16)} was rejected`, `ASIA${'B'.repeat(16)}`],
    [`Slack API rejected the call: invalid_auth, token ${SLACK_TOKEN}`, SLACK_TOKEN],
    [`upstream said: token expired, presented ${BARE_JWT}`, BARE_JWT],
    [`Ocp-Apim-Subscription-Key: ${AZURE_SUBSCRIPTION_KEY}`, AZURE_SUBSCRIPTION_KEY],
    [`git push failed: bad credentials at ${GITHUB_TOKEN}`, GITHUB_TOKEN],
    [`google api rejected token ${GOOGLE_OAUTH_TOKEN}`, GOOGLE_OAUTH_TOKEN],
    // Google API key as a query parameter, bare, and in the other new key formats
    [
      `GET https://generativelanguage.googleapis.com/v1/models?key=${GOOGLE_API_KEY} failed`,
      GOOGLE_API_KEY,
    ],
    [`https://x.googleapis.com/v1/models?alt=json&key=${GOOGLE_API_KEY}`, GOOGLE_API_KEY],
    ['grant_type=x&key=ZZSECRET9&alt=json', 'ZZSECRET9'],
    ['key=ZZSECRET9', 'ZZSECRET9'],
    [`upstream echoed ${GOOGLE_API_KEY} back`, GOOGLE_API_KEY],
    [`hugging face rejected ${HF_TOKEN}`, HF_TOKEN],
    [`pushed with ${GITHUB_PAT}`, GITHUB_PAT],
    [`socket mode failed for ${SLACK_APP_TOKEN}`, SLACK_APP_TOKEN],
    [`${PEM_BLOCK} trailing text`, PEM_BODY_LINE],
    [`-----BEGIN PRIVATE KEY-----\n${PEM_BODY_LINE}`, PEM_BODY_LINE],
    [`the AWS secret access key ${AWS_SECRET_KEY} was rejected`, AWS_SECRET_KEY],
    [`secret key is ${AWS_SECRET_KEY}`, AWS_SECRET_KEY],
    ['cookie: sid="zzsecret9; Path=/"; theme=dark', 'zzsecret9'],
    ['Cookie: session="abc123"; theme=dark', 'abc123'],
    // a rest-of-line consumption must not swallow the next key and leave its value dangling
    ['invalid_token: abc123, password: "hunter2"', 'hunter2'],
    ['cookie: session=abc123; password="hunter2"', 'hunter2'],
    [`invalid_token: abc123, api_key: ${AZURE_SUBSCRIPTION_KEY}`, AZURE_SUBSCRIPTION_KEY],
    [`Cookie: a=b; Signature=${SIGV4_SIGNATURE}`, SIGV4_SIGNATURE],
  ])('redacts %s', (input, secret) => {
    expect(input).toContain(secret);
    expect(truncateUpstreamBody(input)).not.toContain(secret);
  });

  it.each([
    'num_token: 5',
    'max_tokens: 4096',
    'Unexpected token: < in JSON at position 0',
    'Invalid token: signature has expired',
    'special token: <|im_end|>',
    "This model's maximum context length is 32768 tokens. However, you requested 40000 tokens",
    'prompt_tokens: 120, completion_tokens: 80',
    'secretary: Alice',
    'credentials were not provided',
    'Input validation error: inputs tokens + max_new_tokens must be <= 32768',
    '{"object":"error","message":"The input (40000 tokens) is longer than the model\'s context length (32768 tokens).","type":"BadRequestError","param":null,"code":400}',
    'http://10.0.0.5:8000/v1/chat/completions',
    'see https://docs.vllm.ai/en/latest/ for details',
    'ws://host:8080/path',
    'mailto:a@b.c',
    'user@example.com',
    'time 10:30@utc',
    // a plain word `key`, look-alike names and ordinary prose stay readable
    'key',
    'monkey=1',
    'the primary key=1 is duplicated',
    'key: value',
    'Duplicate key value violates unique constraint',
    '{"key":"user_id","value":1}',
    'see https://example.com/search?q=hotkey&sort=asc',
    'https://example.com/a?monkey=1&hotkey=2',
    'Please provide a secret key (40 characters) for the request',
    'The private key is not set',
    'hf_ is the prefix Hugging Face tokens start with',
    'github_pat_ tokens are accepted',
    '-----BEGIN CERTIFICATE-----\nMIIDdzCCAl+gAwIBAgIE\n-----END CERTIFICATE-----',
  ])('keeps %s', (input) => {
    expect(truncateUpstreamBody(input)).toBe(input);
  });

  it('redacts only the value of a key= query parameter and keeps the rest of the URL', () => {
    expect(truncateUpstreamBody('GET /v1/models?alt=json&key=ZZSECRET9&page=2 failed')).toBe(
      'GET /v1/models?alt=json&key=[redacted]&page=2 failed'
    );
  });
});

describe('buildInferenceErrorMessage', () => {
  it('handles AxiosError-shaped errors', () => {
    const message = buildInferenceErrorMessage({
      message: 'Request failed with status code 400',
      response: { status: 400, data: { error: 'context length exceeded' } },
    });
    expect(message).toContain('Request failed with status code 400');
    expect(message).toContain('context length exceeded');
  });

  it('handles ES ResponseError-shaped errors', () => {
    const message = buildInferenceErrorMessage({
      message: 'Response Error',
      statusCode: 503,
      body: 'model overloaded',
    });
    expect(message).toContain('Response Error');
    expect(message).toContain('Status code: 503');
    expect(message).toContain('model overloaded');
  });

  it('handles plain errors, strings and nullish values without throwing', () => {
    expect(buildInferenceErrorMessage(new Error('boom'))).toBe('boom');
    expect(buildInferenceErrorMessage('plain')).toBe('plain');
    expect(buildInferenceErrorMessage(undefined)).toBe('Unknown error');
    expect(buildInferenceErrorMessage({})).toBe('Unknown error');
  });
});

describe('error message boundaries and redaction', () => {
  it('keeps exactly 1000 chars and caps 1001 with the marker', () => {
    expect(truncateUpstreamBody('x'.repeat(1000))).toBe('x'.repeat(1000));
    const result = truncateUpstreamBody('x'.repeat(1001));
    expect(result).toHaveLength(1000);
    expect(result).toContain('... [truncated]');
  });

  it('caps long messages and thrown strings', () => {
    expect(buildInferenceErrorMessage(new Error('m'.repeat(5000)))).toHaveLength(1000);
    expect(buildInferenceErrorMessage('q'.repeat(5000))).toHaveLength(1000);
  });

  it('does not confuse token count with status code', () => {
    expect(
      buildInferenceErrorMessage({ message: 'requested 400 tokens', statusCode: 400, body: 'nope' })
    ).toContain('Status code: 400');
  });

  it('redacts key-bearing bodies while keeping surrounding text', () => {
    const result = buildInferenceErrorMessage({
      response: { data: { error: 'Incorrect API key provided: sk-live-abcdef123456' } },
    });
    expect(result).toContain('Incorrect API key provided: [redacted]');
    expect(result).not.toContain('sk-live-abcdef123456');
  });

  it('redacts plain token credentials after the upstream-response prefix', () => {
    const result = buildInferenceErrorMessage({
      message: 'Request failed with status code 401',
      statusCode: 401,
      body: 'token: abc123',
    });
    expect(result).not.toContain('abc123');
    expect(result).toContain('token: [redacted]');
  });

  it('redacts the full value of quoted credentials containing whitespace', () => {
    expect(truncateUpstreamBody('{"password":"my secret"}')).not.toContain('secret');
    expect(truncateUpstreamBody('token: "abc 123"')).not.toContain('abc');
    const result = buildInferenceErrorMessage({
      message: 'auth failed',
      body: { token: 'abc def ghi' },
    });
    expect(result).not.toContain('def');
    expect(result).toContain('[redacted]');
  });
});

describe('structured redaction of non-scalar secret values', () => {
  it.each([
    ['object value', { password: { inner: 'hunter2' } }, 'hunter2'],
    ['array value', { credential: ['s3cr3t'] }, 's3cr3t'],
    ['deeply nested object value', { error: { api_key: { value: 'k-abc' } } }, 'k-abc'],
    ['token object value', { token: { t: 'xyz' } }, 'xyz'],
    ['camelCase key', { clientSecret: { id: 'cs-123' } }, 'cs-123'],
    ['case-insensitive key', { Authorization: { scheme: 'Basic', v: 'dXNlcjpw' } }, 'dXNlcjpw'],
    ['secret nested in an array', { errors: [{ refresh_token: { v: 'rt-9' } }] }, 'rt-9'],
    ['top-level array body', [{ password: ['pw-1', 'pw-2'] }], 'pw-2'],
  ])('redacts %s from object bodies', (_name, body, secret) => {
    expect(truncateUpstreamBody(body)).not.toContain(secret);
    expect(truncateUpstreamBody(body)).toContain('[redacted]');
    expect(
      buildInferenceErrorMessage({ message: 'failed', response: { data: body } })
    ).not.toContain(secret);
  });

  it.each([
    ['{"password":{"inner":"hunter2"}}', 'hunter2'],
    ['{"credential":["s3cr3t"]}', 's3cr3t'],
    ['{"error":{"api_key":{"value":"k-abc"}}}', 'k-abc'],
    ['{"token":{"t":"xyz"}}', 'xyz'],
    ['[{"secret":{"a":["deep-secret"]}}]', 'deep-secret'],
  ])('redacts non-scalar secrets from JSON string body %s', (body, secret) => {
    expect(truncateUpstreamBody(body)).not.toContain(secret);
    expect(buildInferenceErrorMessage({ message: 'failed', body })).not.toContain(secret);
  });

  it('redacts non-scalar secrets from Buffer bodies', () => {
    const body = Buffer.from('{"password":{"inner":"hunter2"},"detail":"bad request"}');
    const result = truncateUpstreamBody(body);
    expect(result).not.toContain('hunter2');
    expect(result).toContain('bad request');
  });

  it('keeps non-sensitive siblings intact', () => {
    const result = truncateUpstreamBody({
      error: { type: 'invalid_request', max_tokens: 10, password: { a: 'b' } },
    });
    expect(result).toContain('invalid_request');
    expect(result).toContain('"max_tokens":10');
  });

  it('still redacts non-JSON and truncated text through the regex path', () => {
    expect(truncateUpstreamBody('upstream said password: hunter2 sorry')).not.toContain('hunter2');
    expect(truncateUpstreamBody('{"password":"hunter2","detail":"cut o')).not.toContain('hunter2');
    expect(truncateUpstreamBody('Bearer abc.def.ghi failed')).not.toContain('abc.def.ghi');
  });
});

describe('redaction of JSON embedded in error strings', () => {
  const redactors: Array<[string, (input: string) => string]> = [
    ['truncateUpstreamBody', (input) => truncateUpstreamBody(input)],
    ['buildInferenceErrorMessage', (input) => buildInferenceErrorMessage(new Error(input))],
    [
      'buildInferenceErrorMessage (nested reason)',
      (input) => {
        const message = buildInferenceErrorMessage({ error: { reason: input } });
        try {
          return JSON.parse(message).error.reason;
        } catch (e) {
          return message; // fail-closed redaction swallowed the wrapper's closing braces
        }
      },
    ],
  ];

  describe.each(redactors)('%s', (_name, redact) => {
    it.each([
      [
        'non-scalar value in JSON embedded in text',
        'status [400]. Error message: [{"error":{"password":{"inner":"hunter2"}}}]',
        ['hunter2', 'inner'],
      ],
      [
        'array value in JSON embedded in text',
        'status [400]. Error message: [{"credential":["s3cr3t"],"other":"x"}]',
        ['s3cr3t'],
      ],
      [
        'escaped scalars',
        'Error message: [{\\"password\\":\\"hunter2\\",\\"api_key\\":\\"k1\\",\\"access_token\\":\\"t1\\"}]',
        ['hunter2', 'k1', 't1'],
      ],
      [
        'doubly escaped scalars',
        'Error message: [{\\\\\\"password\\\\\\":\\\\\\"hunter2\\\\\\"}]',
        ['hunter2'],
      ],
      [
        'escaped object',
        'Error message: [{\\"error\\":{\\"password\\":{\\"inner\\":\\"hunter2\\"}}}] trailing',
        ['hunter2', 'inner'],
      ],
      [
        'escaped scalar containing an escaped quote',
        'Error message: {\\"password\\":\\"hun\\\\\\"ter2\\"}',
        ['hun', 'ter2'],
      ],
      ['truncated top-level object', '{"password":{"x":"truncatedsecret', ['truncatedsecret']],
      [
        'truncated array under an embedded key',
        'status [400]. Error message: [{"api_key":["trunc-secret-1","trunc',
        ['trunc-secret-1'],
      ],
      [
        'brackets inside strings do not end the secret early',
        'x: {"password":{"a":"}]","b":"leaky"}} tail',
        ['leaky'],
      ],
      ['cookie header', 'Cookie: session=abc123; theme=dark', ['abc123']],
      ['set-cookie header', 'Set-Cookie: sid=zzsecret9; Path=/; HttpOnly', ['zzsecret9']],
      ['quoted cookie', '{"cookie":"sid=zzsecret9; other=1"}', ['zzsecret9']],
      ['passphrase', 'passphrase: correct-horse', ['correct-horse']],
      ['client_assertion', '{"client_assertion":"eyJhbGciOi.zz"}', ['eyJhbGciOi.zz']],
      ['x-goog-api-key', 'x-goog-api-key: AIzaZZSECRET9', ['AIzaZZSECRET9']],
      ['access_key', 'access_key=AKIAZZSECRET9', ['AKIAZZSECRET9']],
      ['numeric access_token', 'access_token: 12345678901234', ['12345678901234']],
      ['numeric session_token', '{session_token: 12345678901234}', ['12345678901234']],
      ['numeric refresh_token', 'refresh_token=12345', ['12345']],
      ['numeric quoted id_token', '{"id_token":12345678901234}', ['12345678901234']],
      [
        'numeric escaped session_token',
        'Error message: [{\\"session_token\\":987654321}]',
        ['987654321'],
      ],
      ['numeric hf_token', 'hf_token: 12345678', ['12345678']],
      ['HTTP_AUTHORIZATION env key', 'HTTP_AUTHORIZATION=Basic dXNlcjpwYXNz', ['dXNlcjpwYXNz']],
      [
        'x-forwarded-authorization header',
        'X-Forwarded-Authorization: Basic dXNlcjpwYXNz',
        ['dXNlcjpwYXNz'],
      ],
      [
        'quoted HTTP_AUTHORIZATION key',
        '{"HTTP_AUTHORIZATION":"Basic dXNlcjpwYXNz"}',
        ['dXNlcjpwYXNz'],
      ],
      ['HTTP_COOKIE env key', 'HTTP_COOKIE=sid=zzsecret9', ['zzsecret9']],
      [
        'quoted credentials object',
        '{"credentials":{"user":"alice","pass":"hunter2"}}',
        ['alice', 'hunter2'],
      ],
      [
        'credentials group with a secret key mid-sentence',
        'Invalid credentials: { reason: "expired", password: "hunter2" } please rotate',
        ['hunter2'],
      ],
      [
        'credentials group at a key position',
        '{"credentials": {"value":"zzsecret9"}}',
        ['zzsecret9'],
      ],
      // Libra 4252529353: a cookie NAMED after a sensitive key (`token=`, `access_token=`)
      // stopped the cookie span at position 0, so the whole header leaked; the header value
      // is now redacted whole
      [
        'cookie header with a token-named cookie',
        'Cookie: token=abc123; sid=secret456',
        ['abc123', 'secret456'],
      ],
      [
        'set-cookie header with a token-named cookie',
        'Set-Cookie: access_token=abc123; sid=secret456',
        ['abc123', 'secret456'],
      ],
      [
        'multi-header cookie dump',
        'Host: x\nCookie: token=abc123; sid=secret456\nAccept: *',
        ['abc123', 'secret456'],
      ],
      // Libra 4243921647: a group following a bare `credentials` key was exempted wholesale;
      // only groups whose keys are ALL diagnostic keys stay readable now
      [
        'credentials group carrying a generic value key',
        'Invalid credentials: { reason: "expired", value: "secretValue" }',
        ['secretValue'],
      ],
      [
        'credentials group carrying a nested secret group',
        'Invalid credentials: { reason: "expired", password: "hunter2" } please rotate',
        ['hunter2'],
      ],
      ['bare credentials with a secret value', 'credentials: zzsecret9', ['zzsecret9']],
      ['bare invalid_token with a secret value', 'invalid_token: zzsecret9', ['zzsecret9']],
    ])('redacts %s', (_label, input, secrets) => {
      const output = redact(input);
      secrets.forEach((secret) => expect(output).not.toContain(secret));
      expect(output).toContain('[redacted]');
    });

    it('keeps the surrounding text of an embedded JSON body readable', () => {
      const output = redact(
        'status [400]. Error message: [{"error":{"message":"bad model","password":{"inner":"hunter2"}},"code":400}]'
      );
      expect(output).toContain('status [400]. Error message:');
      expect(output).toContain('bad model');
    });

    it.each([
      'status [400]. Error message: [{"error":{"message":"max_tokens must be <= 4096","type":"invalid_request_error","code":400}}]',
      '{"error":{"message":"bad request","usage":{"prompt_tokens":120,"completion_tokens":80,"total_tokens":200}}}',
      'usage: {"prompt_tokens": 120, "max_tokens": 4096}',
      'num_token: 5, eos_token: 2',
      'Invalid credentials: { reason: "expired" } please rotate',
      '{"error":"credentials: [missing] for provider"}',
      'invalid_token: The access token expired',
      'status [400]. Error message: [{\\"message\\":\\"unknown field\\",\\"total_tokens\\":200}]',
    ])('keeps ordinary body %s unchanged', (input) => {
      expect(redact(input)).toBe(input);
    });
  });

  describe('prose exemption for bare credentials / invalid_token keys', () => {
    const secretValues: Array<[string, string, string[]]> = [
      ['a Basic header value', 'Basic dmVyeXNlY3JldA==', ['dmVyeXNlY3JldA==']],
      ['a prefixed token', 'token ghp_abcdefghijklmnopqrstuvwxyz1234567890', ['ghp_abcdef']],
      ['a prefixed key', 'key abcdef1234567890XYZ', ['abcdef1234567890XYZ']],
      ['a user and password pair', 'admin letmein', ['letmein']],
      ['a passphrase', 'correcthorse battery staple', ['correcthorse', 'battery', 'staple']],
      ['an upper-case word pair', 'TOPSECRET value', ['TOPSECRET']],
      ['a function word before a secret with a digit', 'The hunter2', ['hunter2']],
      ['a function word before a hyphenated secret', 'the abc-def-ghi', ['abc-def-ghi']],
    ];
    const keySpellings = ['credentials', 'invalid_token', 'invalidToken', 'invalid-token'];
    const forms: Array<[string, (key: string, value: string) => string]> = [
      ['colon', (key, value) => `${key}: ${value}`],
      ['equals', (key, value) => `${key}=${value}`],
      ['newline', (key, value) => `status [401]\n${key}: ${value}`],
      ['tab', (key, value) => `${key}:\t${value}`],
    ];

    it.each(
      keySpellings.flatMap((key) =>
        forms.flatMap(([form, build]) =>
          secretValues.map(
            ([label, value, secrets]) =>
              [`${label} under ${key} (${form})`, build(key, value), secrets] as const
          )
        )
      )
    )('redacts %s', (_label, input, secrets) => {
      [truncateUpstreamBody(input), buildInferenceErrorMessage(new Error(input))].forEach(
        (output) => {
          secrets.forEach((secret) => expect(output).not.toContain(secret));
          expect(output).toContain('[redacted]');
        }
      );
    });

    it.each(
      keySpellings.flatMap((key) =>
        forms.flatMap(([form, build]) =>
          ['The access token expired', 'missing token', 'not provided'].map(
            (value) => [`${key} (${form}): ${value}`, build(key, value)] as const
          )
        )
      )
    )('keeps the prose diagnostic %s readable', (_label, input) => {
      expect(truncateUpstreamBody(input)).toBe(input);
      expect(buildInferenceErrorMessage(new Error(input))).toContain(input);
    });
  });

  it('keeps numeric token COUNTS but redacts numbers under credential-style token keys', () => {
    const output = truncateUpstreamBody({
      usage: { prompt_tokens: 120, total_tokens: 200 },
      access_token: 12345678901234,
      session_token: 12345678901234,
      refresh_token: 12345,
      max_tokens: 4096,
    });
    expect(output).toContain('"prompt_tokens":120');
    expect(output).toContain('"total_tokens":200');
    expect(output).toContain('"max_tokens":4096');
    expect(output).toContain('"access_token":[redacted]');
    expect(output).toContain('"session_token":[redacted]');
    expect(output).toContain('"refresh_token":[redacted]');
    expect(output).not.toContain('12345');
  });

  it('keeps non-secret token diagnostics in a structured body', () => {
    const body = {
      num_token: 5,
      eos_token: '</s>',
      stop_token: '<|end|>',
      pad_token: '<pad>',
      usage: { input_token: 3, total_token: 8 },
    };
    expect(truncateUpstreamBody(body)).toBe(JSON.stringify(body));
    expect(truncateUpstreamBody(JSON.stringify(body))).toBe(JSON.stringify(body));
  });

  it('redacts a numeric credential under a bare token key', () => {
    expect(truncateUpstreamBody({ token: 123456 })).toBe('{"token":[redacted]}');
    expect(truncateUpstreamBody('{"refresh_token": 12345}')).not.toContain('12345');
    expect(truncateUpstreamBody('token: 123456')).not.toContain('123456');
  });

  it('redacts prefixed authorization keys in a structured body', () => {
    const output = truncateUpstreamBody({ HTTP_AUTHORIZATION: 'Basic dXNlcjpwYXNz' });
    expect(output).not.toContain('dXNlcjpwYXNz');
    expect(output).toContain('[redacted]');
  });

  it('still redacts string tokens', () => {
    expect(truncateUpstreamBody({ access_token: 'zzsecret9' })).not.toContain('zzsecret9');
  });
});
