/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import https from 'https';
import type { Response } from 'node-fetch';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { UsageReportingService, type UsageReportingConfig } from './usage_reporting_service';
import type { UsageRecord } from './types';
import { METERING_RETRY_ATTEMPTS, METERING_RETRY_BASE_DELAY_MS } from './constants';

jest.mock('node-fetch');
jest.mock('@kbn/server-http-tools', () => ({
  SslConfig: jest.fn().mockImplementation(() => ({
    rejectUnauthorized: true,
    certificate: 'mock-cert-content',
    key: 'mock-key-content',
    certificateAuthorities: ['mock-ca-content'],
  })),
  sslSchema: {
    validate: jest.fn().mockReturnValue({}),
  },
}));

const fetchMock = jest.requireMock('node-fetch').default as jest.Mock;

const createRecord = (id = 'rec-1'): UsageRecord => ({
  id,
  usage_timestamp: '2025-01-01T00:00:00Z',
  creation_timestamp: '2025-01-01T00:00:01Z',
  usage: {
    type: 'workflow_execution',
    quantity: 1,
  },
  source: {
    id: 'workflows',
    instance_group_id: 'project-123',
  },
});

const createConfig = (overrides: Partial<UsageReportingConfig> = {}): UsageReportingConfig => ({
  enabled: true,
  url: 'http://usage-api.local/v1/usage',
  ...overrides,
});

const okResponse = (): Partial<Response> => ({ ok: true, status: 200 });
const errorResponse = (status = 500): Partial<Response> => ({ ok: false, status });

const advanceThroughRetries = async () => {
  for (let i = 0; i < METERING_RETRY_ATTEMPTS - 1; i++) {
    await jest.advanceTimersByTimeAsync(METERING_RETRY_BASE_DELAY_MS * Math.pow(2, i));
  }
};

describe('UsageReportingService', () => {
  let logger: MockedLogger;

  beforeEach(() => {
    jest.useFakeTimers();
    logger = loggerMock.create();
    fetchMock.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const createService = (configOverrides: Partial<UsageReportingConfig> = {}) =>
    new UsageReportingService({
      config: createConfig(configOverrides),
      kibanaVersion: '9.0.0',
      logger,
    });

  describe('reportUsage', () => {
    it('sends records successfully on first attempt', async () => {
      fetchMock.mockResolvedValueOnce(okResponse());
      const service = createService();

      await service.reportUsage([createRecord()]);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Successfully reported metering')
      );
    });

    it('retries on non-ok response and succeeds', async () => {
      fetchMock.mockResolvedValueOnce(errorResponse(503)).mockResolvedValueOnce(okResponse());

      const service = createService();
      const promise = service.reportUsage([createRecord()]);

      await jest.advanceTimersByTimeAsync(METERING_RETRY_BASE_DELAY_MS);
      await promise;

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.debug).toHaveBeenCalledTimes(1);
    });

    it('retries on network error and succeeds', async () => {
      fetchMock
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockResolvedValueOnce(okResponse());

      const service = createService();
      const promise = service.reportUsage([createRecord()]);

      await jest.advanceTimersByTimeAsync(METERING_RETRY_BASE_DELAY_MS);
      await promise;

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('ECONNREFUSED'));
    });

    it('throws after exhausting all retry attempts (non-ok response)', async () => {
      fetchMock.mockResolvedValue(errorResponse(500));

      const service = createService();
      const promise = service.reportUsage([createRecord()]);
      promise.catch(() => {});

      await advanceThroughRetries();

      await expect(promise).rejects.toThrow('Usage API responded with status 500');
      expect(fetchMock).toHaveBeenCalledTimes(METERING_RETRY_ATTEMPTS);
      expect(logger.warn).toHaveBeenCalledTimes(METERING_RETRY_ATTEMPTS);
    });

    it('throws after exhausting all retry attempts (network error)', async () => {
      fetchMock.mockRejectedValue(new Error('socket hang up'));

      const service = createService();
      const promise = service.reportUsage([createRecord()]);
      promise.catch(() => {});

      await advanceThroughRetries();

      await expect(promise).rejects.toThrow('socket hang up');
      expect(fetchMock).toHaveBeenCalledTimes(METERING_RETRY_ATTEMPTS);
    });

    it('wraps non-Error throwables', async () => {
      fetchMock.mockRejectedValue('string error');

      const service = createService();
      const promise = service.reportUsage([createRecord()]);
      promise.catch(() => {});

      await advanceThroughRetries();

      await expect(promise).rejects.toThrow('string error');
    });

    it('applies exponential backoff between retries', async () => {
      fetchMock
        .mockResolvedValueOnce(errorResponse(503))
        .mockResolvedValueOnce(errorResponse(503))
        .mockResolvedValueOnce(okResponse());

      const service = createService();
      const promise = service.reportUsage([createRecord()]);

      expect(fetchMock).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(METERING_RETRY_BASE_DELAY_MS);
      expect(fetchMock).toHaveBeenCalledTimes(2);

      await jest.advanceTimersByTimeAsync(METERING_RETRY_BASE_DELAY_MS * 2);
      await promise;

      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('logs record ids on success', async () => {
      fetchMock.mockResolvedValueOnce(okResponse());
      const service = createService();

      await service.reportUsage([createRecord('a'), createRecord('b')]);

      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('a, b'));
    });
  });

  describe('request format', () => {
    it('sends POST with JSON content-type and user-agent', async () => {
      fetchMock.mockResolvedValueOnce(okResponse());
      const service = createService();

      await service.reportUsage([createRecord()]);

      const [url, reqInit] = fetchMock.mock.calls[0];
      expect(url).toBe('http://usage-api.local/v1/usage');
      expect(reqInit.method).toBe('post');
      expect(reqInit.headers).toEqual({
        'Content-Type': 'application/json',
        'User-Agent': 'Kibana/9.0.0 node-fetch',
      });
    });

    it('serializes the records as JSON body', async () => {
      fetchMock.mockResolvedValueOnce(okResponse());
      const service = createService();
      const records = [createRecord('r1'), createRecord('r2')];

      await service.reportUsage(records);

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body).toHaveLength(2);
      expect(body[0].id).toBe('r1');
      expect(body[1].id).toBe('r2');
    });

    it('does not attach an https agent for http URLs', async () => {
      fetchMock.mockResolvedValueOnce(okResponse());
      const service = createService({ url: 'http://usage-api.local/v1/usage' });

      await service.reportUsage([createRecord()]);

      expect(fetchMock.mock.calls[0][1].agent).toBeUndefined();
    });

    it('attaches an https agent for https URLs', async () => {
      fetchMock.mockResolvedValueOnce(okResponse());
      const service = createService({
        url: 'https://usage-api.local/v1/usage',
        tls: { certificate: 'cert', key: 'key', ca: 'ca' },
      });

      await service.reportUsage([createRecord()]);

      expect(fetchMock.mock.calls[0][1].agent).toBeInstanceOf(https.Agent);
    });
  });

  describe('URL validation', () => {
    it('throws if url is not configured', async () => {
      const service = createService({ url: undefined });
      const promise = service.reportUsage([createRecord()]);
      promise.catch(() => {});

      await advanceThroughRetries();

      await expect(promise).rejects.toThrow('Usage API URL not configured');
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('TLS / httpAgent', () => {
    it('throws if tls config is not provided for https URL', async () => {
      const service = createService({
        url: 'https://usage-api.local/v1/usage',
        tls: undefined,
      });
      const promise = service.reportUsage([createRecord()]);
      promise.catch(() => {});

      await advanceThroughRetries();

      await expect(promise).rejects.toThrow('Usage API TLS configuration not provided');
    });

    it('reuses the same agent across calls', async () => {
      fetchMock.mockResolvedValue(okResponse());
      const service = createService({
        url: 'https://usage-api.local/v1/usage',
        tls: { certificate: 'cert', key: 'key', ca: 'ca' },
      });

      await service.reportUsage([createRecord()]);
      await service.reportUsage([createRecord()]);

      const agent1 = fetchMock.mock.calls[0][1].agent;
      const agent2 = fetchMock.mock.calls[1][1].agent;
      expect(agent1).toBe(agent2);
    });
  });
});
