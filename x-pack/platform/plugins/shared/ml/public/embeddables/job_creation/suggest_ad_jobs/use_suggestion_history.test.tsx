/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { JOB_TYPE } from '../../../../common/constants/new_job';
import type { JobSuggestion } from '../../../../common/types/job_suggestions';
import { getPreviousRun, saveRun } from './previous_runs';
import type { SuggestionRun } from './previous_runs';
import type { SuggestionsState } from './job_suggestion_service';
import { useSuggestionHistory } from './use_suggestion_history';

let mockSecurity: { authc: { getCurrentUser: jest.Mock } } | undefined;

jest.mock('../../../application/contexts/kibana', () => ({
  useMlKibana: () => ({ services: { security: mockSecurity } }),
}));

const suggestion = (id: string): JobSuggestion => ({
  id,
  title: `Title ${id}`,
  description: `Description ${id}`,
  jobType: JOB_TYPE.MULTI_METRIC,
  job: {
    job_id: `job-${id}`,
    description: 'Suggested by AI.',
    analysis_config: { bucket_span: '15m', detectors: [{ function: 'count' }] },
    data_description: { time_field: '@timestamp' },
  },
  datafeed: {
    datafeed_id: `datafeed-job-${id}`,
    job_id: `job-${id}`,
    indices: ['logs-*'],
    query: {},
  },
  validation: { status: 'valid', messages: [] },
});

const timeRange = { from: 'now-30d', to: 'now' };
const run = (id: string, ranAt = 1000): SuggestionRun => ({
  timeRange,
  ranAt,
  suggestions: [suggestion(id)],
});
const loaded = (id: string, ranAt = 2000): SuggestionsState => ({
  status: 'loaded',
  suggestions: [suggestion(id)],
  timeRange,
  ranAt,
});

describe('useSuggestionHistory', () => {
  let storage: Storage;

  beforeEach(() => {
    window.localStorage.clear();
    storage = new Storage(window.localStorage);
    mockSecurity = {
      authc: { getCurrentUser: jest.fn().mockResolvedValue({ username: 'alice' }) },
    };
  });

  it('has no previous run when nothing was stored', async () => {
    const { result } = renderHook(() => useSuggestionHistory('logs-*', { status: 'loading' }));

    await waitFor(() => expect(mockSecurity?.authc.getCurrentUser).toHaveBeenCalled());
    expect(result.current).toBeUndefined();
  });

  it('returns the run which was stored for the index pattern', async () => {
    saveRun(storage, 'alice', 'logs-*', run('earlier'));

    const { result } = renderHook(() => useSuggestionHistory('logs-*', { status: 'loading' }));

    await waitFor(() => expect(result.current).toEqual(run('earlier')));
  });

  it('does not return the run of another index pattern or user', async () => {
    saveRun(storage, 'alice', 'metrics-*', run('other index'));
    saveRun(storage, 'bob', 'logs-*', run('other user'));

    const { result } = renderHook(() => useSuggestionHistory('logs-*', { status: 'loading' }));

    await waitFor(() => expect(mockSecurity?.authc.getCurrentUser).toHaveBeenCalled());
    expect(result.current).toBeUndefined();
  });

  it('stores a run when it completes', async () => {
    const { rerender } = renderHook(
      ({ state }: { state: SuggestionsState }) => useSuggestionHistory('logs-*', state),
      { initialProps: { state: { status: 'loading' } as SuggestionsState } }
    );

    rerender({ state: loaded('new') });

    await waitFor(() =>
      expect(getPreviousRun(storage, 'alice', 'logs-*')).toEqual(run('new', 2000))
    );
  });

  it('keeps showing the run from when it opened while a new run is stored in its place', async () => {
    saveRun(storage, 'alice', 'logs-*', run('earlier'));
    const { result, rerender } = renderHook(
      ({ state }: { state: SuggestionsState }) => useSuggestionHistory('logs-*', state),
      { initialProps: { state: { status: 'loading' } as SuggestionsState } }
    );
    await waitFor(() => expect(result.current).toEqual(run('earlier')));

    rerender({ state: loaded('new') });

    await waitFor(() =>
      expect(getPreviousRun(storage, 'alice', 'logs-*')).toEqual(run('new', 2000))
    );
    expect(result.current).toEqual(run('earlier'));
  });

  it('does not store runs which failed or found nothing', async () => {
    const { rerender } = renderHook(
      ({ state }: { state: SuggestionsState }) => useSuggestionHistory('logs-*', state),
      { initialProps: { state: { status: 'loading' } as SuggestionsState } }
    );
    await waitFor(() => expect(mockSecurity?.authc.getCurrentUser).toHaveBeenCalled());

    rerender({ state: { status: 'error', error: 'failed' } });
    rerender({ state: { status: 'loaded', suggestions: [], timeRange, ranAt: 3000 } });

    expect(getPreviousRun(storage, 'alice', 'logs-*')).toBeUndefined();
  });

  it('uses one shared place when there is no security', async () => {
    mockSecurity = undefined;
    saveRun(storage, 'anonymous', 'logs-*', run('earlier'));

    const { result } = renderHook(() => useSuggestionHistory('logs-*', { status: 'loading' }));

    await waitFor(() => expect(result.current).toEqual(run('earlier')));
  });

  it('carries on when the user cannot be found', async () => {
    mockSecurity = { authc: { getCurrentUser: jest.fn().mockRejectedValue(new Error('no user')) } };
    saveRun(storage, 'anonymous', 'logs-*', run('earlier'));

    const { result } = renderHook(() => useSuggestionHistory('logs-*', { status: 'loading' }));

    await waitFor(() => expect(result.current).toEqual(run('earlier')));
  });
});
