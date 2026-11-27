/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  setSelectedJobId,
  setShowAnomalies,
} from '../application/components/job_suggestion/selected_job';
import { createDiscoverADAnomaliesAction } from './discover_ad_anomalies_action';

const mockLoadAnomalyRanges = jest.fn();

jest.mock('./load_anomaly_ranges', () => ({
  loadAnomalyRanges: (...args: unknown[]) => mockLoadAnomalyRanges(...args),
}));
jest.mock('../application/services/ml_api_service', () => ({
  mlApiProvider: () => ({}),
}));
jest.mock('../application/services/http_service', () => ({
  HttpService: jest.fn(),
}));
jest.mock('../application/capabilities/check_capabilities', () => ({
  checkPermissionAsync: jest.fn().mockResolvedValue(true),
}));

const INDEX_PATTERN = 'action-*';
const timeRange = { from: 0, to: 1000 };
const trigger = { id: 'DISCOVER_AD_ANOMALIES_TRIGGER' };
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('discover anomalies action', () => {
  const action = createDiscoverADAnomaliesAction(
    jest.fn().mockResolvedValue([{ http: {} }, {}, {}]) as never
  );

  const execute = (abortController: AbortController, onAnomalyRanges: jest.Mock) =>
    action.execute({
      trigger,
      indexPattern: INDEX_PATTERN,
      timeRange,
      signal: abortController.signal,
      onAnomalyRanges,
    });

  beforeEach(() => {
    window.localStorage.clear();
    setSelectedJobId(INDEX_PATTERN, undefined);
    setShowAnomalies(INDEX_PATTERN, true);
    mockLoadAnomalyRanges.mockReset();
    mockLoadAnomalyRanges.mockImplementation(async ({ jobId }: { jobId: string }) => [
      { jobId, start: 0, end: 10, score: jobId === 'a' ? 50 : 90 },
    ]);
  });

  it('provides no anomalies when no job is selected, without loading any', async () => {
    const abortController = new AbortController();
    const onAnomalyRanges = jest.fn();
    const done = execute(abortController, onAnomalyRanges);
    await flushPromises();

    expect(onAnomalyRanges).toHaveBeenCalledWith([]);
    expect(mockLoadAnomalyRanges).not.toHaveBeenCalled();

    abortController.abort();
    await done;
  });

  it('provides the anomalies of the selected job, and again when another is selected', async () => {
    setSelectedJobId(INDEX_PATTERN, 'a');
    const abortController = new AbortController();
    const onAnomalyRanges = jest.fn();
    const done = execute(abortController, onAnomalyRanges);
    await flushPromises();

    expect(mockLoadAnomalyRanges).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: 'a', timeRange })
    );
    expect(onAnomalyRanges).toHaveBeenLastCalledWith([
      { jobId: 'a', start: 0, end: 10, score: 50 },
    ]);

    setSelectedJobId(INDEX_PATTERN, 'b');
    await flushPromises();
    expect(onAnomalyRanges).toHaveBeenLastCalledWith([
      { jobId: 'b', start: 0, end: 10, score: 90 },
    ]);

    setSelectedJobId(INDEX_PATTERN, undefined);
    await flushPromises();
    expect(onAnomalyRanges).toHaveBeenLastCalledWith([]);

    abortController.abort();
    await done;
  });

  it('provides no anomalies while they are hidden, without deselecting the job', async () => {
    setSelectedJobId(INDEX_PATTERN, 'a');
    const abortController = new AbortController();
    const onAnomalyRanges = jest.fn();
    const done = execute(abortController, onAnomalyRanges);
    await flushPromises();

    setShowAnomalies(INDEX_PATTERN, false);
    await flushPromises();
    expect(onAnomalyRanges).toHaveBeenLastCalledWith([]);

    setShowAnomalies(INDEX_PATTERN, true);
    await flushPromises();
    expect(onAnomalyRanges).toHaveBeenLastCalledWith([
      { jobId: 'a', start: 0, end: 10, score: 50 },
    ]);

    abortController.abort();
    await done;
  });

  it('tells which job is selected, and whether its anomalies are shown, and lets them be hidden', async () => {
    setSelectedJobId(INDEX_PATTERN, 'a');
    const abortController = new AbortController();
    const onJobSelection = jest.fn();
    const done = action.execute({
      trigger,
      indexPattern: INDEX_PATTERN,
      timeRange,
      signal: abortController.signal,
      onAnomalyRanges: jest.fn(),
      onJobSelection,
    });
    await flushPromises();

    expect(onJobSelection).toHaveBeenLastCalledWith(
      expect.objectContaining({ jobId: 'a', showAnomalies: true })
    );

    onJobSelection.mock.lastCall[0].setShowAnomalies(false);
    expect(onJobSelection).toHaveBeenLastCalledWith(
      expect.objectContaining({ jobId: 'a', showAnomalies: false })
    );

    setSelectedJobId(INDEX_PATTERN, undefined);
    expect(onJobSelection).toHaveBeenLastCalledWith(
      expect.objectContaining({ jobId: undefined, showAnomalies: false })
    );

    abortController.abort();
    await done;
  });

  it('stops providing anomalies when it is aborted', async () => {
    const abortController = new AbortController();
    const onAnomalyRanges = jest.fn();
    const done = execute(abortController, onAnomalyRanges);
    await flushPromises();
    abortController.abort();
    await done;
    onAnomalyRanges.mockClear();

    setSelectedJobId(INDEX_PATTERN, 'a');
    await flushPromises();
    expect(onAnomalyRanges).not.toHaveBeenCalled();
  });

  it('is compatible with an index pattern, but not without one', async () => {
    const isCompatible = (indexPattern: string) =>
      action.isCompatible?.({ trigger, indexPattern, timeRange, onAnomalyRanges: jest.fn() });
    expect(await isCompatible(INDEX_PATTERN)).toBe(true);
    expect(await isCompatible('')).toBe(false);
  });
});
