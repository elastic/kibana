/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '../app_context';

import {
  applyManagedOtlpDefaults,
  getManagedOtlpEndpoint,
  isManagedOtlpEndpoint,
} from './managed_otlp';

jest.mock('../app_context');

const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;

const MANAGED_HOST = 'my-cluster.ingest.elastic.cloud';

describe('getManagedOtlpEndpoint', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns undefined when managedOtlp is absent', () => {
    mockedAppContextService.getCloud.mockReturnValue({} as any);
    expect(getManagedOtlpEndpoint()).toBeUndefined();
  });

  it('returns the url when managedOtlp is present', () => {
    mockedAppContextService.getCloud.mockReturnValue({
      managedOtlp: { url: MANAGED_HOST },
    } as any);
    expect(getManagedOtlpEndpoint()).toBe(MANAGED_HOST);
  });
});

describe('isManagedOtlpEndpoint', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns false when cloud.managedOtlp is absent', () => {
    mockedAppContextService.getCloud.mockReturnValue({} as any);
    expect(isManagedOtlpEndpoint(MANAGED_HOST)).toBe(false);
  });

  describe('when cloud.managedOtlp.url is set', () => {
    beforeEach(() => {
      mockedAppContextService.getCloud.mockReturnValue({
        managedOtlp: { url: MANAGED_HOST },
      } as any);
    });

    it.each([
      ['bare host', MANAGED_HOST],
      ['host:port (gRPC convention)', `${MANAGED_HOST}:4317`],
      ['https://host', `https://${MANAGED_HOST}`],
      ['https://host:443 (explicit default port)', `https://${MANAGED_HOST}:443`],
    ])('matches %s', (_label, endpoint) => {
      expect(isManagedOtlpEndpoint(endpoint)).toBe(true);
    });

    it.each([
      ['managed bulk path', `${MANAGED_HOST}/_es`],
      ['different host', 'other-cluster.ingest.elastic.cloud'],
      ['empty string', ''],
    ])('does not match %s', (_label, endpoint) => {
      expect(isManagedOtlpEndpoint(endpoint)).toBe(false);
    });
  });
});

describe('applyManagedOtlpDefaults', () => {
  const exporter = (sendingQueue?: unknown) =>
    ({
      protocol: 'grpc',
      endpoint: MANAGED_HOST,
      ...(sendingQueue !== undefined ? { sending_queue: sendingQueue } : {}),
    } as any);

  beforeEach(() => {
    mockedAppContextService.getCloud.mockReturnValue({
      managedOtlp: { url: MANAGED_HOST },
    } as any);
  });

  afterEach(() => jest.clearAllMocks());

  it('fills a queue that is left out with the recommended settings', () => {
    expect(applyManagedOtlpDefaults(exporter()).sending_queue).toEqual({
      enabled: true,
      sizer: 'bytes',
      queue_size: 50_000_000,
      block_on_overflow: true,
      batch: { flush_timeout: '1s', min_size: 1_000_000, max_size: 4_000_000, sizer: 'bytes' },
    });
  });

  it('fills the null settings with the recommended ones', () => {
    expect(
      applyManagedOtlpDefaults(
        exporter({
          enabled: true,
          num_consumers: null,
          queue_size: null,
          sizer: 'bytes',
          wait_for_result: false,
          block_on_overflow: true,
          batch: { flush_timeout: null, min_size: null, max_size: null, partition: null },
        })
      ).sending_queue
    ).toEqual({
      enabled: true,
      num_consumers: null,
      queue_size: 50_000_000,
      sizer: 'bytes',
      wait_for_result: false,
      block_on_overflow: true,
      batch: {
        flush_timeout: '1s',
        min_size: 1_000_000,
        max_size: 4_000_000,
        sizer: 'bytes',
        partition: null,
      },
    });
  });

  it('keeps the settings that are set', () => {
    expect(
      applyManagedOtlpDefaults(
        exporter({
          queue_size: 10_000_000,
          block_on_overflow: false,
          batch: { flush_timeout: '5s', min_size: 0, max_size: 0 },
        })
      ).sending_queue
    ).toEqual({
      enabled: true,
      sizer: 'bytes',
      queue_size: 10_000_000,
      block_on_overflow: false,
      batch: { flush_timeout: '5s', min_size: 0, max_size: 0, sizer: 'bytes' },
    });
  });

  it('keeps a null queue and a null batch', () => {
    expect(applyManagedOtlpDefaults(exporter(null)).sending_queue).toBeNull();
    expect(applyManagedOtlpDefaults(exporter({ batch: null })).sending_queue?.batch).toBeNull();
  });

  it('does not set the recommended sizes, in bytes, for a queue and a batch that count items', () => {
    expect(
      applyManagedOtlpDefaults(
        exporter({
          sizer: 'items',
          queue_size: null,
          batch: { sizer: 'items', min_size: null, max_size: null },
        })
      ).sending_queue
    ).toEqual({
      enabled: true,
      sizer: 'items',
      queue_size: null,
      block_on_overflow: true,
      batch: { flush_timeout: '1s', sizer: 'items', min_size: null, max_size: null },
    });
  });

  it('does not change the queue of an endpoint that is not managed', () => {
    const otherExporter = { ...exporter({ queue_size: null }), endpoint: 'collector.example.com' };
    expect(applyManagedOtlpDefaults(otherExporter)).toBe(otherExporter);
  });
});
