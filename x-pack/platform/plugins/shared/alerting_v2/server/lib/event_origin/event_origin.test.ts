/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { resolveRequestEventOrigin, toEventOrigin } from './event_origin';

const UI_HEADERS = {
  'kbn-version': '9.0.0',
  referer: 'http://localhost:5601/app/discover',
  'x-elastic-internal-origin': 'kibana',
};

const executionContextHeader = (context: object) => encodeURIComponent(JSON.stringify(context));

const createRequest = (
  headers: Record<string, string> = {},
  { isFakeRequest = false }: { isFakeRequest?: boolean } = {}
): KibanaRequest => ({
  ...httpServerMock.createKibanaRequest({ headers }),
  isFakeRequest,
});

describe('toEventOrigin', () => {
  it('attaches the actor to the channel derived from the request', () => {
    expect(toEventOrigin('internal', createRequest({}, { isFakeRequest: true }))).toEqual({
      actor: 'internal',
      channel: 'system',
    });
  });

  it('keeps a configured app ahead of the execution context', () => {
    const request = createRequest({
      ...UI_HEADERS,
      'x-kbn-context': executionContextHeader({ name: 'discover' }),
    });

    expect(toEventOrigin('user', request, { app: 'nightshift' })).toEqual({
      actor: 'user',
      channel: 'ui',
      app: 'nightshift',
    });
  });
});

describe('resolveRequestEventOrigin', () => {
  describe('channel', () => {
    it('is `system` for a fake request', () => {
      expect(resolveRequestEventOrigin(createRequest({}, { isFakeRequest: true }))).toEqual({
        channel: 'system',
      });
    });

    it('is `system` for a fake request even when it carries the UI headers', () => {
      const request = createRequest(UI_HEADERS, { isFakeRequest: true });

      expect(resolveRequestEventOrigin(request).channel).toBe('system');
    });

    it('is `ui` when kbn-version, referer, and x-elastic-internal-origin are all present', () => {
      expect(resolveRequestEventOrigin(createRequest(UI_HEADERS)).channel).toBe('ui');
    });

    it.each(Object.keys(UI_HEADERS))('is `api` when %s is missing', (missingHeader) => {
      const { [missingHeader]: _omitted, ...headers } = UI_HEADERS as Record<string, string>;

      expect(resolveRequestEventOrigin(createRequest(headers)).channel).toBe('api');
    });

    it('is `api` for a request with no UI headers', () => {
      expect(resolveRequestEventOrigin(createRequest({ authorization: 'ApiKey abc' }))).toEqual({
        channel: 'api',
      });
    });
  });

  describe('app', () => {
    it('is the configured app when options.app is set', () => {
      expect(resolveRequestEventOrigin(createRequest(), { app: 'nightshift' })).toEqual({
        channel: 'api',
        app: 'nightshift',
      });
    });

    it('prefers the configured app over the execution context on `ui` requests', () => {
      const request = createRequest({
        ...UI_HEADERS,
        'x-kbn-context': executionContextHeader({ type: 'application', name: 'discover' }),
      });

      expect(resolveRequestEventOrigin(request, { app: 'nightshift' })).toEqual({
        channel: 'ui',
        app: 'nightshift',
      });
    });

    it('is the name of the x-kbn-context execution context on `ui` requests', () => {
      const request = createRequest({
        ...UI_HEADERS,
        'x-kbn-context': executionContextHeader({
          type: 'application',
          name: 'discover',
          page: 'app',
        }),
      });

      expect(resolveRequestEventOrigin(request)).toEqual({ channel: 'ui', app: 'discover' });
    });

    it('is undefined on `ui` requests without an x-kbn-context header', () => {
      expect(resolveRequestEventOrigin(createRequest(UI_HEADERS))).toEqual({ channel: 'ui' });
    });

    it.each([
      ['is not valid JSON', 'not-json'],
      ['is malformed URI encoding', '%E0%A4%A'],
      ['has no name', executionContextHeader({ type: 'application' })],
      ['has a non-string name', executionContextHeader({ name: 42 })],
      ['has an empty name', executionContextHeader({ name: '' })],
    ])('is undefined on `ui` requests when x-kbn-context %s', (_description, header) => {
      const request = createRequest({ ...UI_HEADERS, 'x-kbn-context': header });

      expect(resolveRequestEventOrigin(request)).toEqual({ channel: 'ui' });
    });

    it.each(['observabilityAlerting', 'agent_builder', 'app.name:id'])(
      'keeps a configured app id of %s',
      (app) => {
        expect(resolveRequestEventOrigin(createRequest(), { app })).toEqual({
          channel: 'api',
          app,
        });
      }
    );

    it.each([
      ['contains a space', 'my app'],
      ['contains a slash', 'discover/app'],
      ['is longer than 64 characters', 'a'.repeat(65)],
    ])('omits a configured app that %s', (_description, app) => {
      expect(resolveRequestEventOrigin(createRequest(), { app })).toEqual({ channel: 'api' });
    });

    it('uses the execution context when the configured app is outside the allowed set', () => {
      const request = createRequest({
        ...UI_HEADERS,
        'x-kbn-context': executionContextHeader({ name: 'discover' }),
      });

      expect(resolveRequestEventOrigin(request, { app: 'not an app' })).toEqual({
        channel: 'ui',
        app: 'discover',
      });
    });

    it('omits an execution-context name outside the allowed set', () => {
      const request = createRequest({
        ...UI_HEADERS,
        'x-kbn-context': executionContextHeader({ name: 'discover/app' }),
      });

      expect(resolveRequestEventOrigin(request)).toEqual({ channel: 'ui' });
    });

    it('ignores the execution context on `api` requests', () => {
      const request = createRequest({
        'x-kbn-context': executionContextHeader({ type: 'application', name: 'discover' }),
      });

      expect(resolveRequestEventOrigin(request)).toEqual({ channel: 'api' });
    });

    it('ignores the execution context on `system` requests', () => {
      const request = createRequest(
        { 'x-kbn-context': executionContextHeader({ name: 'discover' }) },
        { isFakeRequest: true }
      );

      expect(resolveRequestEventOrigin(request)).toEqual({ channel: 'system' });
    });
  });
});
