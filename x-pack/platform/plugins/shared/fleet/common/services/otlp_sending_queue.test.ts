/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getOtlpBatchSizer,
  getOtlpSendingQueueSizeError,
  mergeOtlpSendingQueue,
  omitRemovedOtlpQueueSettings,
  withRemovedStoredSettings,
} from './otlp_sending_queue';

describe('getOtlpBatchSizer', () => {
  it.each([
    ['bytes', 'requests', 'bytes'],
    [undefined, 'bytes', 'bytes'],
    [null, 'items', 'items'],
    [undefined, 'requests', 'items'],
  ])(
    'returns %p for a batch unit of %p under a queue of %p',
    (batchSizer, queueSizer, expected) => {
      expect(getOtlpBatchSizer(batchSizer, queueSizer)).toBe(expected);
    }
  );
});

describe('mergeOtlpSendingQueue', () => {
  const stored = {
    sizer: 'items' as const,
    queue_size: 10_000,
    batch: { sizer: 'items' as const, min_size: 500, partition: { metadata_keys: ['a', 'b'] } },
  };

  it('keeps the stored queue when the update leaves it out', () => {
    expect(mergeOtlpSendingQueue(stored, undefined)).toBe(stored);
  });

  it('replaces the stored queue with null or an empty object', () => {
    expect(mergeOtlpSendingQueue(stored, null)).toBeNull();
    expect(mergeOtlpSendingQueue(stored, {})).toEqual({});
  });

  it('merges the settings of the update into the stored ones', () => {
    expect(mergeOtlpSendingQueue(stored, { queue_size: null, batch: { min_size: 1000 } })).toEqual({
      sizer: 'items',
      queue_size: null,
      batch: { sizer: 'items', min_size: 1000, partition: { metadata_keys: ['a', 'b'] } },
    });
  });

  it('replaces a stored batch with an empty one, and a stored list with the new one', () => {
    expect(mergeOtlpSendingQueue(stored, { batch: {} })).toEqual({ ...stored, batch: {} });
    expect(
      mergeOtlpSendingQueue(stored, { batch: { partition: { metadata_keys: ['c'] } } })?.batch
    ).toEqual({ sizer: 'items', min_size: 500, partition: { metadata_keys: ['c'] } });
  });

  it('uses the update when nothing is stored', () => {
    expect(mergeOtlpSendingQueue(undefined, { queue_size: 1 })).toEqual({ queue_size: 1 });
    expect(mergeOtlpSendingQueue(null, { queue_size: 1 })).toEqual({ queue_size: 1 });
  });
});

describe('withRemovedStoredSettings', () => {
  it('sets the stored settings that the value does not have to null, at every level', () => {
    expect(
      withRemovedStoredSettings(
        { queue_size: 1, batch: { min_size: 2 } },
        { queue_size: 5, sizer: 'items', batch: { min_size: 3, sizer: 'items' } }
      )
    ).toEqual({ queue_size: 1, sizer: null, batch: { min_size: 2, sizer: null } });
  });

  it('returns the value when it or the stored value is not an object', () => {
    expect(withRemovedStoredSettings(null, { queue_size: 5 })).toBeNull();
    expect(withRemovedStoredSettings({ queue_size: 1 }, undefined)).toEqual({ queue_size: 1 });
  });
});

describe('omitRemovedOtlpQueueSettings', () => {
  it('leaves out the null of the settings that only take a value', () => {
    expect(
      omitRemovedOtlpQueueSettings({
        enabled: null,
        sizer: null,
        wait_for_result: null,
        block_on_overflow: null,
        queue_size: null,
        batch: { sizer: null, min_size: null },
      } as any)
    ).toEqual({ queue_size: null, batch: { min_size: null } });
  });

  it('keeps a null queue and a null batch, which are opt-outs', () => {
    expect(omitRemovedOtlpQueueSettings(null)).toBeNull();
    expect(omitRemovedOtlpQueueSettings({ batch: null })).toEqual({ batch: null });
  });
});

describe('getOtlpSendingQueueSizeError', () => {
  it('returns an error for a minimum batch size that does not fit in the queue', () => {
    expect(
      getOtlpSendingQueueSizeError({ sizer: 'items', queue_size: 100, batch: { sizer: 'items' } })
    ).toBe(
      'sending_queue.batch.min_size (8192) can not be more than sending_queue.queue_size (100) when both use the same unit'
    );
  });

  it('returns an error for a maximum batch size below the minimum', () => {
    expect(
      getOtlpSendingQueueSizeError({
        sizer: 'bytes',
        queue_size: 50_000_000,
        batch: { min_size: 2000, max_size: 1000 },
      })
    ).toBe(
      'sending_queue.batch.max_size (1000) can not be less than sending_queue.batch.min_size (2000), unless it is 0'
    );
  });

  it.each([
    ['sizes that fit', { sizer: 'items', queue_size: 10_000, batch: { sizer: 'items' } }],
    ['batch units that differ', { sizer: 'bytes', queue_size: 100, batch: { sizer: 'items' } }],
    ['a queue that counts requests', { queue_size: 100, batch: {} }],
    ['no maximum', { batch: { min_size: 100, max_size: 0 } }],
    ['a queue that is off', { enabled: false, sizer: 'items', batch: { sizer: 'items' } }],
    ['no batching', { sizer: 'items', queue_size: 100, batch: null }],
    ['no queue', null],
  ])('returns nothing for %s', (_label, queue) => {
    expect(getOtlpSendingQueueSizeError(queue as any)).toBeUndefined();
  });
});
