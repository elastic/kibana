/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fetch from 'node-fetch';

import { ECF_FALLBACK_TEMPLATE_VERSION } from '../../common/ecf_template_version';
import { getLatestEcfVersion } from './ecf_version';

jest.mock('node-fetch');

const mockedFetch = fetch as jest.MockedFunction<typeof fetch>;

const { loggerMock } = jest.requireActual('@kbn/logging-mocks');
const mockLogger = loggerMock.create();

/** A minimal YAML excerpt that contains a parseable SemanticVersion field. */
const TEMPLATE_YAML_1_10_0 = `
Metadata:
  AWS::ServerlessRepo::Application:
    SemanticVersion: 1.10.0
`;

/** Helper to build a resolved fetch response. */
const mockFetchOk = (body: string) =>
  ({
    ok: true,
    status: 200,
    text: jest.fn().mockResolvedValue(body),
  } as any);

const mockFetchError = (status: number) =>
  ({
    ok: false,
    status,
    text: jest.fn().mockResolvedValue(''),
  } as any);

beforeEach(() => {
  loggerMock.clear(mockLogger);
  mockedFetch.mockReset();
});

describe('getLatestEcfVersion()', () => {
  describe('successful remote fetch', () => {
    it('returns the version parsed from the template body with source: remote', async () => {
      mockedFetch.mockResolvedValue(mockFetchOk(TEMPLATE_YAML_1_10_0));
      const result = await getLatestEcfVersion(mockLogger, { ignoreCache: true });
      expect(result).toEqual({ version: '1.10.0', source: 'remote' });
    });

    it('fetches from the v1/latest/ S3 path', async () => {
      mockedFetch.mockResolvedValue(mockFetchOk(TEMPLATE_YAML_1_10_0));
      await getLatestEcfVersion(mockLogger, { ignoreCache: true });
      const url = mockedFetch.mock.calls[0][0] as string;
      expect(url).toContain('/v1/latest/');
      expect(url).toContain('edot-cloud-forwarder.s3.amazonaws.com');
    });
  });

  describe('fallback scenarios', () => {
    it('returns the fallback when the response status is not 2xx', async () => {
      mockedFetch.mockResolvedValue(mockFetchError(403));
      const result = await getLatestEcfVersion(mockLogger, { ignoreCache: true });
      expect(result).toEqual({ version: ECF_FALLBACK_TEMPLATE_VERSION, source: 'fallback' });
    });

    it('returns the fallback when the body contains no SemanticVersion field', async () => {
      mockedFetch.mockResolvedValue(mockFetchOk('AWSTemplateFormatVersion: "2010-09-09"'));
      const result = await getLatestEcfVersion(mockLogger, { ignoreCache: true });
      expect(result).toEqual({ version: ECF_FALLBACK_TEMPLATE_VERSION, source: 'fallback' });
    });

    it('returns the fallback when fetch throws a network error', async () => {
      mockedFetch.mockRejectedValue(new Error('ECONNREFUSED'));
      const result = await getLatestEcfVersion(mockLogger, { ignoreCache: true });
      expect(result).toEqual({ version: ECF_FALLBACK_TEMPLATE_VERSION, source: 'fallback' });
    });

    it('never throws regardless of the error type', async () => {
      mockedFetch.mockRejectedValue(new TypeError('fetch is not a function'));
      await expect(getLatestEcfVersion(mockLogger, { ignoreCache: true })).resolves.not.toThrow();
    });
  });

  describe('in-memory cache', () => {
    it('returns the cached value on a second call within the TTL', async () => {
      mockedFetch.mockResolvedValue(mockFetchOk(TEMPLATE_YAML_1_10_0));

      // Prime the cache.
      await getLatestEcfVersion(mockLogger);
      // Second call should hit the cache, not re-fetch.
      const result = await getLatestEcfVersion(mockLogger);

      expect(mockedFetch).toHaveBeenCalledTimes(1);
      expect(result.source).toBe('remote');
    });

    it('does not prime the cache when ignoreCache is true', async () => {
      mockedFetch.mockResolvedValue(mockFetchOk(TEMPLATE_YAML_1_10_0));

      await getLatestEcfVersion(mockLogger, { ignoreCache: true });
      await getLatestEcfVersion(mockLogger, { ignoreCache: true });

      // Each ignoreCache call must issue its own fetch.
      expect(mockedFetch).toHaveBeenCalledTimes(2);
    });
  });
});
