/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { classifyConnectorFailure, getHttpStatus } from './classify_connector_failure';
import { AllowlistDeniedError } from './connector_network_errors';
import { RelayRequestError } from '../relay/relay_error';

/** An axios error for a request the vendor answered. */
const responseError = (status: number) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    config: {},
    request: {},
    response: { status, headers: {}, data: {} },
  });

/** An axios error for a request that never produced a response. */
const transportError = (code: string) =>
  Object.assign(new Error(code), { config: {}, request: {}, code });

describe('classifyConnectorFailure', () => {
  describe('vendor_4xx', () => {
    it.each([400, 401, 403, 404, 409, 422, 429, 499])('classifies %i', (status) => {
      expect(classifyConnectorFailure(responseError(status))).toBe('vendor_4xx');
    });

    it('classifies a vendor rate limit, which is not the framework rate limiter', () => {
      expect(classifyConnectorFailure(responseError(429))).toBe('vendor_4xx');
    });
  });

  describe('vendor_5xx', () => {
    it.each([500, 502, 503, 504, 599])('classifies %i', (status) => {
      expect(classifyConnectorFailure(responseError(status))).toBe('vendor_5xx');
    });
  });

  describe('network', () => {
    it.each([
      'EAI_AGAIN',
      'ECONNABORTED',
      'ECONNREFUSED',
      'ECONNRESET',
      'EHOSTUNREACH',
      'ENETUNREACH',
      'ENOTFOUND',
      'EPIPE',
      'EPROTO',
      'ETIMEDOUT',
      'ERR_CANCELED',
      'ERR_NETWORK',
    ])('classifies %s', (code) => {
      expect(classifyConnectorFailure(transportError(code))).toBe('network');
    });

    it('classifies a request that got no response and carries no code', () => {
      const error = Object.assign(new Error('socket hang up'), { config: {}, request: {} });
      expect(classifyConnectorFailure(error)).toBe('network');
    });

    it('does not classify a reply that arrived but could not be used', () => {
      // axios raises this after the response arrived, e.g. a body over maxContentLength.
      const error = Object.assign(new Error('maxContentLength exceeded'), {
        request: { res: { headers: { 'content-length': '2048' } } },
      });

      expect(classifyConnectorFailure(error)).toBe('handler');
    });
  });

  describe('denied', () => {
    it('classifies an allowlist denial, which never leaves Kibana', () => {
      expect(classifyConnectorFailure(new AllowlistDeniedError('target url is not allowed'))).toBe(
        'denied'
      );
    });

    it('prefers denied over any status or code the error happens to carry', () => {
      const error = Object.assign(new AllowlistDeniedError('denied'), {
        code: 'ECONNREFUSED',
        request: {},
        response: { status: 503 },
      });

      expect(classifyConnectorFailure(error)).toBe('denied');
    });
  });

  describe('handler', () => {
    it('classifies a TypeError thrown while reading a response', () => {
      let error: unknown;
      try {
        const response = { data: undefined } as { data?: { items: string[] } };
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        response.data!.items.length;
      } catch (err) {
        error = err;
      }

      expect(error).toBeInstanceOf(TypeError);
      expect(classifyConnectorFailure(error)).toBe('handler');
    });

    it('classifies a plain error thrown by connector code', () => {
      expect(classifyConnectorFailure(new Error('no document id in the response'))).toBe('handler');
    });

    it('classifies a thrown value that is not an error', () => {
      expect(classifyConnectorFailure('something went wrong')).toBe('handler');
      expect(classifyConnectorFailure(undefined)).toBe('handler');
      expect(classifyConnectorFailure(null)).toBe('handler');
    });

    it('classifies a response outside the error ranges', () => {
      expect(classifyConnectorFailure(responseError(302))).toBe('handler');
    });

    it('classifies a non-numeric status as a handler failure, not a vendor one', () => {
      const error = Object.assign(new Error('odd'), { response: { status: '500' } });
      expect(classifyConnectorFailure(error)).toBe('handler');
    });
  });

  describe('transports that are not axios', () => {
    it('classifies a Relay 5xx as a vendor outage, not a connector bug', () => {
      const error = new RelayRequestError('/chat.postMessage', 503, 'upstream unavailable');

      expect(classifyConnectorFailure(error)).toBe('vendor_5xx');
    });

    it('classifies a Relay 4xx as a vendor rejection', () => {
      const error = new RelayRequestError('/chat.postMessage', 400, 'invalid_payload');

      expect(classifyConnectorFailure(error)).toBe('vendor_4xx');
    });

    it('ignores a non-numeric top-level status', () => {
      const error = Object.assign(new Error('odd'), { statusCode: '503' });

      expect(classifyConnectorFailure(error)).toBe('handler');
    });
  });

  it('prefers the vendor status over a transport code when both are present', () => {
    const error = Object.assign(new Error('failed'), {
      code: 'ECONNRESET',
      request: {},
      response: { status: 503 },
    });

    expect(classifyConnectorFailure(error)).toBe('vendor_5xx');
  });
});

describe('getHttpStatus', () => {
  it('reads a numeric response status', () => {
    expect(getHttpStatus(responseError(404))).toBe(404);
  });

  it('returns undefined when there is no response', () => {
    expect(getHttpStatus(transportError('ETIMEDOUT'))).toBeUndefined();
    expect(getHttpStatus(new Error('boom'))).toBeUndefined();
    expect(getHttpStatus(undefined)).toBeUndefined();
  });

  it('returns undefined for a non-numeric status', () => {
    expect(getHttpStatus({ response: { status: '404' } })).toBeUndefined();
  });
});
