/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createDeductiveSession,
  refreshDeductiveToken,
  sendDeductiveMessageAndReadSse,
  DeductiveError,
  DeductiveSessionUnavailableError,
} from './deductive_client';

const sseBody = (chunks: string[]): ReadableStream<Uint8Array> => {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(new TextEncoder().encode(chunk));
      }
      controller.close();
    },
  });
};

interface MockResponse {
  status: number;
  json?: () => Promise<unknown>;
  body?: ReadableStream<Uint8Array>;
}

const fetchMock = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
});

const asResponse = (mock: MockResponse): Response =>
  ({
    status: mock.status,
    ok: mock.status >= 200 && mock.status < 300,
    json: mock.json ?? (async () => ({})),
    body: mock.body ?? null,
  } as unknown as Response);

describe('deductive_client', () => {
  describe('createDeductiveSession', () => {
    it('posts mode=ask with bearer auth and parses the session', async () => {
      fetchMock.mockResolvedValueOnce(
        asResponse({
          status: 201,
          json: async () => ({ session_id: 'session-123', url: 'https://url/threads/session-123' }),
        })
      );

      const session = await createDeductiveSession({
        endpoint: 'https://turing.deductive.ai',
        token: 'dak_secretkey',
        teamId: 'team-1',
      });

      expect(session.sessionId).toBe('session-123');
      const [url, init] = fetchMock.mock.calls[0];
      expect(String(url)).toBe('https://turing.deductive.ai/api/v1/sessions');
      expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer dak_secretkey');
      expect((init?.headers as Record<string, string>)['X-Team-Id']).toBe('team-1');
      expect(JSON.parse(init?.body as string)).toEqual({ mode: 'ask' });
    });
  });

  describe('refreshDeductiveToken', () => {
    it('exchanges a refresh token for a new access token', async () => {
      fetchMock.mockResolvedValueOnce(
        asResponse({
          status: 200,
          json: async () => ({ access_token: 'new-token', refresh_token: 'new-refresh' }),
        })
      );

      const result = await refreshDeductiveToken({
        endpoint: 'https://turing.deductive.ai',
        refreshToken: 'old-refresh',
      });

      expect(result.token).toBe('new-token');
      expect(result.refreshToken).toBe('new-refresh');
    });
  });

  describe('sendDeductiveMessageAndReadSse', () => {
    it('opens the stream, waits for connected, posts the message, and collects the answer', async () => {
      fetchMock.mockImplementation(async (url) => {
        if (String(url).endsWith('/stream')) {
          return asResponse({
            status: 200,
            body: sseBody([
              'data: {"type":"connected","session_id":"s1"}\n\n',
              ': heartbeat\n',
              'data: {"type":"progress","message":"Analyzing"}\n\n',
              'data: {"type":"answer","content":"The root cause is"}\n\n',
              'data: {"type":"answer","content":" a broken pipe."}\n\n',
              'data: {"type":"complete","status":"answer_ready"}\n\n',
            ]),
          });
        }
        return asResponse({ status: 202 });
      });

      const onAnswerChunk = jest.fn();
      const onProgress = jest.fn();

      const result = await sendDeductiveMessageAndReadSse({
        endpoint: 'https://turing.deductive.ai',
        token: 'tok',
        sessionId: 's1',
        message: 'hello',
        callbacks: { onAnswerChunk, onProgress },
      });

      const messageCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/messages'));
      expect(messageCall).toBeDefined();
      expect(JSON.parse((messageCall![1]?.body as string) ?? '{}')).toEqual({ message: 'hello' });

      expect(result.answer).toBe('The root cause is a broken pipe.');
      expect(onAnswerChunk.mock.calls.flat()).toEqual(['The root cause is', ' a broken pipe.']);
      expect(onProgress).toHaveBeenCalledWith('Analyzing');
    });

    it('passes output_schema when structured output is requested', async () => {
      fetchMock.mockImplementation(async (url) => {
        if (String(url).endsWith('/stream')) {
          return asResponse({ status: 200, body: sseBody(['data: {"type":"connected"}\n\n']) });
        }
        return asResponse({ status: 200 });
      });

      try {
        await sendDeductiveMessageAndReadSse({
          endpoint: 'https://turing.deductive.ai',
          token: 'tok',
          sessionId: 's1',
          message: 'structured',
          outputSchema: '{"action":"str"}',
          timeoutMs: 100,
        });
      } catch (error) {
        // expected: the stream closes without an answer
      }

      const messageCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/messages'));
      expect(JSON.parse((messageCall![1]?.body as string) ?? '{}')).toEqual({
        message: 'structured',
        output_schema: '{"action":"str"}',
      });
    });

    it('throws DeductiveError on an error event', async () => {
      fetchMock.mockImplementation(async (url) => {
        if (String(url).endsWith('/stream')) {
          return asResponse({
            status: 200,
            body: sseBody([
              'data: {"type":"connected"}\n\n',
              'data: {"type":"error","message":"boom"}\n\n',
            ]),
          });
        }
        return asResponse({ status: 202 });
      });

      try {
        await sendDeductiveMessageAndReadSse({
          endpoint: 'https://turing.deductive.ai',
          token: 'tok',
          sessionId: 's1',
          message: 'hi',
        });
        throw new Error('expected to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(DeductiveError);
        expect((error as Error).message).toBe('boom');
      }
    });

    it('throws DeductiveSessionUnavailableError on 404', async () => {
      fetchMock.mockResolvedValueOnce(asResponse({ status: 404 }));

      try {
        await sendDeductiveMessageAndReadSse({
          endpoint: 'https://turing.deductive.ai',
          token: 'tok',
          sessionId: 'gone',
          message: 'hi',
        });
        throw new Error('expected to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(DeductiveSessionUnavailableError);
      }
    });

    it('throws DeductiveError when the stream closes without an answer', async () => {
      fetchMock.mockResolvedValueOnce(asResponse({ status: 200, body: sseBody([]) }));

      try {
        await sendDeductiveMessageAndReadSse({
          endpoint: 'https://turing.deductive.ai',
          token: 'tok',
          sessionId: 's1',
          message: 'hi',
        });
        throw new Error('expected to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(DeductiveError);
        expect((error as Error).message).toBe('deductive stream closed without an answer');
      }
    });
  });
});
