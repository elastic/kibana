/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BatchObservableResult, Meter, Observable } from '@opentelemetry/api';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  HEAP_PROFILE_LABELS_ENV,
  isHeapProfileLabelsEnabled,
  maybeStopHeapProfile,
} from './experimental_heap_profile_labels';

const mockGetAllocationProfile = jest.fn();
const mockStopProfile = jest.fn();
const mockWithHeapProfileLabels = jest.fn((_labels: Record<string, string>, fn: () => unknown) =>
  fn()
);
const mockStartHeapProfile = jest.fn(
  (_options?: { labels?: boolean; sampleInterval?: number }) => ({
    getAllocationProfile: mockGetAllocationProfile,
    stop: mockStopProfile,
  })
);

jest.mock('v8', () => ({
  withHeapProfileLabels: (labels: Record<string, string>, fn: () => unknown) =>
    mockWithHeapProfileLabels(labels, fn),
  startHeapProfile: (options: { labels?: boolean; sampleInterval?: number }) =>
    mockStartHeapProfile(options),
}));

import {
  HEAP_PROFILE_LIVE_METRIC,
  HEAP_PROFILE_SAMPLE_COUNT_METRIC,
  HEAP_PROFILE_SCRAPE_DURATION_METRIC,
  OTHER,
  UNLABELED,
  aggregateProfile,
  collapseTopN,
  snapshotFromProfile,
  startHeapProfileLabelsMetrics,
  taskTypeFromLabels,
} from './heap_profile_labels_metrics';

const createMeter = () => {
  const instruments: Record<string, Observable> = {};
  const addBatchObservableCallback = jest.fn();
  const removeBatchObservableCallback = jest.fn();
  const createObservableGauge = jest.fn((name: string) => {
    const instrument = { name } as unknown as Observable;
    instruments[name] = instrument;
    return instrument;
  });
  const meter = {
    createObservableGauge,
    addBatchObservableCallback,
    removeBatchObservableCallback,
  } as unknown as Meter;
  return { meter, instruments, addBatchObservableCallback, removeBatchObservableCallback };
};

describe('heap_profile_labels_metrics', () => {
  const previous = process.env[HEAP_PROFILE_LABELS_ENV];
  const logger = loggingSystemMock.createLogger();

  afterEach(() => {
    maybeStopHeapProfile();
    mockGetAllocationProfile.mockReset();
    mockStopProfile.mockReset();
    mockStartHeapProfile.mockClear();
    if (previous === undefined) {
      delete process.env[HEAP_PROFILE_LABELS_ENV];
    } else {
      process.env[HEAP_PROFILE_LABELS_ENV] = previous;
    }
  });

  test('is enabled when the labels API exists unless KBN_HEAP_PROFILE_LABELS=0', () => {
    delete process.env[HEAP_PROFILE_LABELS_ENV];
    expect(isHeapProfileLabelsEnabled()).toBe(true);
    process.env[HEAP_PROFILE_LABELS_ENV] = '0';
    expect(isHeapProfileLabelsEnabled()).toBe(false);
  });

  test('taskTypeFromLabels maps missing labels to _unlabeled', () => {
    expect(taskTypeFromLabels(undefined)).toBe(UNLABELED);
    expect(taskTypeFromLabels({})).toBe(UNLABELED);
    expect(taskTypeFromLabels({ 'task.type': 'alerting:monitoring' })).toBe('alerting:monitoring');
  });

  test('aggregateProfile splits exact external bytes from sampled heap', () => {
    const { external, sampled, sampleCounts } = aggregateProfile({
      externalBytes: [
        { labels: { 'task.type': 'reports:execute' }, bytes: 100 },
        { labels: { 'task.type': 'reports:execute' }, bytes: 50 },
        { labels: {}, bytes: 7 },
      ],
      samples: [
        { size: 128, count: 4, labels: { 'task.type': 'alerting:monitoring' } },
        { size: 64, count: 2, labels: {} },
      ],
    });

    expect(external.get('reports:execute')).toBe(150);
    expect(external.get(UNLABELED)).toBe(7);
    expect(sampled.get('alerting:monitoring')).toBe(512);
    expect(sampled.get(UNLABELED)).toBe(128);
    expect(sampleCounts.get('alerting:monitoring')).toBe(4);
  });

  test('aggregateProfile treats missing externalBytes as empty', () => {
    const { external, sampled } = aggregateProfile({
      samples: [{ size: 10, count: 2, labels: { 'task.type': 'reports:execute' } }],
    });
    expect(external.size).toBe(0);
    expect(sampled.get('reports:execute')).toBe(20);
  });

  test('collapseTopN folds overflow into _other', () => {
    const collapsed = collapseTopN(
      new Map([
        ['a', 10],
        ['b', 9],
        ['c', 1],
      ]),
      2
    );
    expect(collapsed.get('a')).toBe(10);
    expect(collapsed.get('b')).toBe(9);
    expect(collapsed.get(OTHER)).toBe(1);
  });

  test('snapshotFromProfile drops confidence and keeps memory.source', () => {
    const snapshot = snapshotFromProfile(
      {
        externalBytes: [{ labels: { 'task.type': 'reports:execute' }, bytes: 40 }],
        samples: [{ size: 8, count: 3, labels: { 'task.type': 'reports:execute' } }],
      },
      1.5
    );
    expect(snapshot.scrapeDurationMs).toBe(1.5);
    expect(snapshot.live).toEqual([
      { taskType: 'reports:execute', source: 'exact', bytes: 40 },
      { taskType: 'reports:execute', source: 'sampled_heap', bytes: 24 },
    ]);
    expect(snapshot.sampleCount).toEqual([{ taskType: 'reports:execute', count: 3 }]);
  });

  test('snapshotFromProfile is empty when getAllocationProfile returns undefined', () => {
    expect(snapshotFromProfile(undefined, 2)).toEqual({
      live: [],
      sampleCount: [],
      scrapeDurationMs: 2,
    });
  });

  test('registers observable gauges and scrapes inside the batch callback', () => {
    mockGetAllocationProfile.mockReturnValue({
      externalBytes: [{ labels: { 'task.type': 'reports:execute' }, bytes: 40 }],
      samples: [{ size: 8, count: 3, labels: { 'task.type': 'reports:execute' } }],
    });

    const { meter, instruments, addBatchObservableCallback, removeBatchObservableCallback } =
      createMeter();
    const started = startHeapProfileLabelsMetrics(logger, { meter });
    expect(started).toBeDefined();
    expect(mockStartHeapProfile).toHaveBeenCalledWith({ labels: true, sampleInterval: 64 * 1024 });
    expect(addBatchObservableCallback).toHaveBeenCalledTimes(1);

    const [callback, registered] = addBatchObservableCallback.mock.calls[0];
    expect(registered).toEqual([
      instruments[HEAP_PROFILE_LIVE_METRIC],
      instruments[HEAP_PROFILE_SAMPLE_COUNT_METRIC],
      instruments[HEAP_PROFILE_SCRAPE_DURATION_METRIC],
    ]);

    const observe = jest.fn();
    callback({ observe } as unknown as BatchObservableResult);

    expect(mockGetAllocationProfile).toHaveBeenCalled();
    expect(observe).toHaveBeenCalledWith(instruments[HEAP_PROFILE_LIVE_METRIC], 40, {
      'task.type': 'reports:execute',
      'memory.source': 'exact',
    });
    expect(observe).toHaveBeenCalledWith(instruments[HEAP_PROFILE_LIVE_METRIC], 24, {
      'task.type': 'reports:execute',
      'memory.source': 'sampled_heap',
    });
    expect(observe).toHaveBeenCalledWith(instruments[HEAP_PROFILE_SAMPLE_COUNT_METRIC], 3, {
      'task.type': 'reports:execute',
    });
    expect(observe).toHaveBeenCalledWith(
      instruments[HEAP_PROFILE_SCRAPE_DURATION_METRIC],
      expect.any(Number)
    );

    started?.stop();
    expect(removeBatchObservableCallback).toHaveBeenCalled();
    expect(mockStopProfile).toHaveBeenCalled();
  });

  test('does not start when opted out', () => {
    process.env[HEAP_PROFILE_LABELS_ENV] = '0';
    const { meter, addBatchObservableCallback } = createMeter();
    expect(startHeapProfileLabelsMetrics(logger, { meter })).toBeUndefined();
    expect(addBatchObservableCallback).not.toHaveBeenCalled();
    expect(mockStartHeapProfile).not.toHaveBeenCalled();
  });

  test('logs once when getAllocationProfile throws and does not rethrow', () => {
    mockGetAllocationProfile.mockImplementation(() => {
      throw new Error('scrape failed');
    });
    const { meter, addBatchObservableCallback } = createMeter();
    const started = startHeapProfileLabelsMetrics(logger, { meter });
    const [callback] = addBatchObservableCallback.mock.calls[0];
    const observe = jest.fn();
    expect(() => callback({ observe } as unknown as BatchObservableResult)).not.toThrow();
    expect(() => callback({ observe } as unknown as BatchObservableResult)).not.toThrow();
    expect(logger.warn).toHaveBeenCalledTimes(1);
    started?.stop();
  });
});
