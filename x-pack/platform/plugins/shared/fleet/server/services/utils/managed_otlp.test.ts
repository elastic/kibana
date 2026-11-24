/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '../app_context';

import { OutputInvalidError } from '../../errors';

import {
  applyManagedOtlpDefaults,
  getManagedOtlpEndpoint,
  getOtlpExporterUpdate,
  isManagedOtlpEndpoint,
  validateOtlpSendingQueueSizes,
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

  it('fills the recommended settings whatever the units, leaving the sizes to the validation', () => {
    expect(
      applyManagedOtlpDefaults(exporter({ sizer: 'items', batch: { sizer: 'items' } })).sending_queue
    ).toEqual({
      enabled: true,
      sizer: 'items',
      queue_size: 50_000_000,
      block_on_overflow: true,
      batch: { flush_timeout: '1s', sizer: 'items', min_size: 1_000_000, max_size: 4_000_000 },
    });
  });

  it('does not change the queue of an endpoint that is not managed', () => {
    const otherExporter = { ...exporter({ queue_size: null }), endpoint: 'collector.example.com' };
    expect(applyManagedOtlpDefaults(otherExporter)).toBe(otherExporter);
  });
});

describe('validateOtlpSendingQueueSizes', () => {
  const warn = jest.fn();

  beforeEach(() => {
    mockedAppContextService.getLogger.mockReturnValue({ warn } as any);
  });

  afterEach(() => jest.clearAllMocks());

  it('rejects a minimum batch size that does not fit in the queue', () => {
    expect(() =>
      validateOtlpSendingQueueSizes({
        queue: { sizer: 'items', batch: { sizer: 'items' } },
        fromPreconfiguration: false,
      })
    ).toThrow(OutputInvalidError);
  });

  it('rejects a maximum batch size below the minimum', () => {
    expect(() =>
      validateOtlpSendingQueueSizes({
        queue: {
          sizer: 'bytes',
          queue_size: 50_000_000,
          batch: { min_size: 2000, max_size: 1000 },
        },
        fromPreconfiguration: false,
      })
    ).toThrow(/max_size \(1000\) can not be less than/);
  });

  it('accepts sizes that fit, a queue that is off, and a queue without batching', () => {
    [
      { sizer: 'items' as const, queue_size: 10_000, batch: { sizer: 'items' as const } },
      { enabled: false, sizer: 'items' as const, batch: { sizer: 'items' as const } },
      { sizer: 'items' as const, batch: null },
      null,
      undefined,
    ].forEach((queue) =>
      expect(() =>
        validateOtlpSendingQueueSizes({ queue, fromPreconfiguration: false })
      ).not.toThrow()
    );
  });

  it('only warns for a preconfigured output', () => {
    expect(() =>
      validateOtlpSendingQueueSizes({
        queue: { sizer: 'items', batch: { sizer: 'items' } },
        fromPreconfiguration: true,
      })
    ).not.toThrow();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('min_size (8192)'));
  });
});

describe('getOtlpExporterUpdate', () => {
  const OTHER_HOST = 'collector.example.com:4317';
  const update = (endpoint: string, sendingQueue?: unknown) =>
    ({
      protocol: 'grpc',
      endpoint,
      ...(sendingQueue !== undefined ? { sending_queue: sendingQueue } : {}),
    } as any);
  const stored = (endpoint: string, sendingQueue: unknown) =>
    ({ protocol: 'grpc', endpoint, sending_queue: sendingQueue } as any);

  beforeEach(() => {
    mockedAppContextService.getCloud.mockReturnValue({
      managedOtlp: { url: MANAGED_HOST },
    } as any);
  });

  afterEach(() => jest.clearAllMocks());

  it('keeps the stored settings that a partial update of the managed endpoint leaves out', () => {
    const storedQueue = {
      sizer: 'items',
      queue_size: 100_000,
      block_on_overflow: false,
      batch: { sizer: 'items', min_size: 2000 },
    };
    expect(
      getOtlpExporterUpdate({
        update: update(MANAGED_HOST, { batch: { min_size: 3000 } }),
        stored: stored(MANAGED_HOST, storedQueue),
        fromPreconfiguration: false,
      }).sending_queue
    ).toEqual({
      enabled: true,
      sizer: 'items',
      queue_size: 100_000,
      block_on_overflow: false,
      batch: { flush_timeout: '1s', sizer: 'items', min_size: 3000, max_size: 4_000_000 },
    });
    expect(
      getOtlpExporterUpdate({
        update: update(MANAGED_HOST),
        stored: stored(MANAGED_HOST, storedQueue),
        fromPreconfiguration: false,
      }).sending_queue
    ).toEqual(expect.objectContaining({ queue_size: 100_000, block_on_overflow: false }));
  });

  it('replaces the stored batch with an empty one, as the saved object update does', () => {
    // the stored minimum of 500 fits in 1000 items, the default minimum of 8192 does not
    expect(() =>
      getOtlpExporterUpdate({
        update: update(OTHER_HOST, { batch: {} }),
        stored: stored(OTHER_HOST, {
          sizer: 'items',
          queue_size: 1000,
          batch: { sizer: 'items', min_size: 500 },
        }),
        fromPreconfiguration: false,
      })
    ).toThrow(OutputInvalidError);
  });

  it('removes the stored settings that the merged queue does not have', () => {
    expect(
      getOtlpExporterUpdate({
        update: update(OTHER_HOST, { batch: {} }),
        stored: stored(OTHER_HOST, {
          sizer: 'items',
          queue_size: 10_000,
          batch: { sizer: 'items', min_size: 500 },
        }),
        fromPreconfiguration: false,
      }).sending_queue
    ).toEqual({
      sizer: 'items',
      queue_size: 10_000,
      batch: { sizer: null, min_size: null },
    });
  });

  it('checks the update merged into the stored queue', () => {
    // the stored queue size holds the batch that the update sets
    expect(() =>
      getOtlpExporterUpdate({
        update: update(OTHER_HOST, { sizer: 'items', batch: { sizer: 'items' } }),
        stored: stored(OTHER_HOST, { sizer: 'items', queue_size: 100_000 }),
        fromPreconfiguration: false,
      })
    ).not.toThrow();
    // the stored batch does not fit in the queue size of the update
    expect(() =>
      getOtlpExporterUpdate({
        update: update(OTHER_HOST, { queue_size: 500 }),
        stored: stored(OTHER_HOST, {
          sizer: 'items',
          queue_size: 100_000,
          batch: { sizer: 'items', min_size: 2000 },
        }),
        fromPreconfiguration: false,
      })
    ).toThrow(OutputInvalidError);
  });

  it('leaves out the queue of an update when there is none to write', () => {
    const otherUpdate = update(OTHER_HOST);
    expect(
      getOtlpExporterUpdate({ update: otherUpdate, stored: undefined, fromPreconfiguration: false })
    ).toBe(otherUpdate);
  });
});
