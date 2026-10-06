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
    ['hf_token: ZZSECRET9', 'ZZSECRET9'],
    ['api_token: ZZSECRET9', 'ZZSECRET9'],
    ['bearer_token: ZZSECRET9', 'ZZSECRET9'],
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
  ])('redacts %s', (input, secret) => {
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
  ])('keeps %s', (input) => {
    expect(truncateUpstreamBody(input)).toBe(input);
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
