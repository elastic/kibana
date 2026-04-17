/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { registerSlackEventsRoute } from './slack_events';

jest.mock('../lib/slack_handler', () => ({
  handleSlackEvent: jest.fn().mockResolvedValue(undefined),
}));

import { handleSlackEvent } from '../lib/slack_handler';

const mockLogger = loggingSystemMock.create().get();
const mockHandleSlackEvent = handleSlackEvent as jest.MockedFunction<typeof handleSlackEvent>;

const BOT_TOKEN = 'xoxb-test-token';
const KIBANA_API_KEY = Buffer.from('key-id:key-secret').toString('base64');

// Spy on setImmediate so we can await the async callback directly instead of
// relying on timer queue ordering. Without this, the async work inside the
// callback (getStartServices, ESO decrypt, handleSlackEvent) won't complete
// before the test assertions run.
let capturedImmediateCallback: (() => Promise<void>) | null = null;
let setImmediateSpy: jest.SpyInstance;

const createMockEsoClient = (overrides?: { getDecryptedError?: Error }) => ({
  getDecryptedAsInternalUser: overrides?.getDecryptedError
    ? jest.fn().mockRejectedValue(overrides.getDecryptedError)
    : jest.fn().mockResolvedValue({
        attributes: { bot_token: BOT_TOKEN, kibana_api_key: KIBANA_API_KEY },
      }),
});

const createMockCoreSetup = (esoClient = createMockEsoClient()) => ({
  getStartServices: jest.fn().mockResolvedValue([
    { elasticsearch: { client: {} } },
    {
      encryptedSavedObjects: { getClient: jest.fn().mockReturnValue(esoClient) },
      inference: {},
    },
  ]),
});

describe('registerSlackEventsRoute', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedImmediateCallback = null;
    setImmediateSpy = jest
      .spyOn(global, 'setImmediate')
      .mockImplementation((fn: TimerHandler) => {
        capturedImmediateCallback = fn as () => Promise<void>;
        return 0 as unknown as NodeJS.Immediate;
      });
  });

  afterEach(() => {
    setImmediateSpy.mockRestore();
  });

  const registerAndGetHandler = (coreSetup: unknown) => {
    router = httpServiceMock.createRouter();
    registerSlackEventsRoute({ router, coreSetup: coreSetup as never, logger: mockLogger });
    const [, handler] = router.post.mock.calls[0];
    return handler;
  };

  const callHandler = async (handler: Function, body: Record<string, unknown>) => {
    const response = httpServerMock.createResponseFactory();
    const request = httpServerMock.createKibanaRequest({ body });
    await handler({} as never, request, response);
    return { response, request };
  };

  // Run the captured setImmediate callback to completion (including its async chain)
  const runImmediateCallback = async () => {
    if (capturedImmediateCallback) {
      await capturedImmediateCallback();
    }
  };

  describe('immediate ack', () => {
    it('always returns 200 immediately for event_callback — Slack 3s requirement', async () => {
      const handler = registerAndGetHandler(createMockCoreSetup());

      const { response } = await callHandler(handler, {
        type: 'event_callback',
        event: { type: 'app_mention', ts: '1', channel: 'C1', text: 'hello' },
      });

      expect(response.ok).toHaveBeenCalledWith({ body: { ok: true } });
    });

    it('returns 200 for url_verification before loading any credentials', async () => {
      const esoClient = createMockEsoClient();
      const handler = registerAndGetHandler(createMockCoreSetup(esoClient));

      const { response } = await callHandler(handler, {
        type: 'url_verification',
        challenge: 'abc123',
      });

      expect(response.ok).toHaveBeenCalledWith({ body: { challenge: 'abc123' } });
      expect(esoClient.getDecryptedAsInternalUser).not.toHaveBeenCalled();
    });

    it('returns 200 for unknown event types without processing', async () => {
      const handler = registerAndGetHandler(createMockCoreSetup());

      const { response } = await callHandler(handler, { type: 'unknown_type' });

      expect(response.ok).toHaveBeenCalledWith({ body: { ok: true } });
      // No async processing should be scheduled for unknown types
      expect(capturedImmediateCallback).toBeNull();
    });
  });

  describe('bot token revoked or expired mid-session', () => {
    it('logs a warning and skips handleSlackEvent when no credentials are stored', async () => {
      const esoClient = createMockEsoClient({
        getDecryptedError: new Error('Saved object not found'),
      });
      const handler = registerAndGetHandler(createMockCoreSetup(esoClient));

      await callHandler(handler, {
        type: 'event_callback',
        event: { type: 'app_mention', ts: '1', channel: 'C1', text: 'hello' },
      });

      await runImmediateCallback();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('no bot_token stored yet')
      );
      expect(mockHandleSlackEvent).not.toHaveBeenCalled();
    });

    it('logs an error but does not crash when handleSlackEvent throws', async () => {
      mockHandleSlackEvent.mockRejectedValueOnce(new Error('invalid_auth'));
      const handler = registerAndGetHandler(createMockCoreSetup());

      await callHandler(handler, {
        type: 'event_callback',
        event: { type: 'app_mention', ts: '1', channel: 'C1', text: 'hello' },
      });

      await runImmediateCallback();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('invalid_auth')
      );
    });

    it('still returns 200 to Slack even when event processing fails', async () => {
      mockHandleSlackEvent.mockRejectedValueOnce(new Error('invalid_auth'));
      const handler = registerAndGetHandler(createMockCoreSetup());

      const { response } = await callHandler(handler, {
        type: 'event_callback',
        event: { type: 'app_mention', ts: '1', channel: 'C1', text: 'hello' },
      });

      // Ack is sent before processing — must already be 200 regardless of later failure
      expect(response.ok).toHaveBeenCalledWith({ body: { ok: true } });
    });
  });

  describe('event forwarding', () => {
    it('calls handleSlackEvent with the correct event fields', async () => {
      const handler = registerAndGetHandler(createMockCoreSetup());

      await callHandler(handler, {
        type: 'event_callback',
        event: {
          type: 'app_mention',
          ts: '1700000000.123',
          channel: 'C1234567890',
          thread_ts: '1700000000.000',
          text: '<@U123> hello bot',
          user: 'U999',
        },
      });

      await runImmediateCallback();

      expect(mockHandleSlackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            type: 'app_mention',
            ts: '1700000000.123',
            channel: 'C1234567890',
            thread_ts: '1700000000.000',
            text: '<@U123> hello bot',
            user: 'U999',
          }),
          botToken: BOT_TOKEN,
        })
      );
    });

    it('injects the stored API key into the inference request headers', async () => {
      const handler = registerAndGetHandler(createMockCoreSetup());

      await callHandler(handler, {
        type: 'event_callback',
        event: { type: 'app_mention', ts: '1', channel: 'C1', text: 'hello' },
      });

      await runImmediateCallback();

      const { request: inferenceRequest } = mockHandleSlackEvent.mock.calls[0][0];
      expect(inferenceRequest.headers.authorization).toBe(`ApiKey ${KIBANA_API_KEY}`);
    });

    it('skips processing when event field is missing from callback', async () => {
      const handler = registerAndGetHandler(createMockCoreSetup());

      await callHandler(handler, { type: 'event_callback' }); // no event field

      // No setImmediate callback should have been scheduled
      expect(capturedImmediateCallback).toBeNull();
      expect(mockHandleSlackEvent).not.toHaveBeenCalled();
    });
  });
});
