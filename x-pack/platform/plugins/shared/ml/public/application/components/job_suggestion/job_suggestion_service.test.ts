/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { JOB_TYPE } from '../../../../common/constants/new_job';
import type { JobSuggestion, SuggestJobsResponse } from '../../../../common/types/job_suggestions';
import { JobSuggestionService } from './job_suggestion_service';
import type { SuggestionsState } from './job_suggestion_service';

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

const response = (...ids: string[]): SuggestJobsResponse => ({ suggestions: ids.map(suggestion) });

// a promise which is settled by the test, to control when an answer arrives
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const timeRange = { from: 'now-30d', to: 'now' };

describe('JobSuggestionService', () => {
  const suggestJobs = jest.fn();
  const calculateBounds = jest.fn();
  let service: JobSuggestionService;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(5000);
    calculateBounds.mockReturnValue({ min: moment(1000), max: moment(2000) });
    service = new JobSuggestionService({ suggestJobs }, { calculateBounds });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('is loading before anything is asked', () => {
    expect(service.state).toEqual({ status: 'loading' });
  });

  it('asks for the index pattern over the time range', async () => {
    suggestJobs.mockResolvedValue(response('a'));

    await service.suggest('logs-*', { from: 'now-7d', to: 'now' });

    expect(calculateBounds).toHaveBeenCalledWith({ from: 'now-7d', to: 'now' });
    expect(suggestJobs).toHaveBeenCalledTimes(1);
    expect(suggestJobs).toHaveBeenCalledWith(
      { index: 'logs-*', start: 1000, end: 2000 },
      expect.any(AbortSignal)
    );
  });

  it('is loaded with the suggestions, the time range asked for and when they arrived', async () => {
    suggestJobs.mockResolvedValue(response('a', 'b'));

    await service.suggest('logs-*', timeRange);

    expect(service.state).toEqual({
      status: 'loaded',
      suggestions: [suggestion('a'), suggestion('b')],
      timeRange,
      ranAt: 5000,
    });
  });

  it('is loading while it waits, and tells observers of each state', async () => {
    const answer = deferred<SuggestJobsResponse>();
    suggestJobs.mockReturnValue(answer.promise);
    const states: SuggestionsState[] = [];
    service.state$.subscribe((state) => states.push(state));

    const request = service.suggest('logs-*', timeRange);
    expect(service.state).toEqual({ status: 'loading' });
    answer.resolve(response('a'));
    await request;

    expect(states.map(({ status }) => status)).toEqual(['loading', 'loading', 'loaded']);
  });

  it('shows the error when asking fails, without rejecting', async () => {
    const error = { body: { statusCode: 501, error: 'Not Implemented', message: 'No AI' } };
    suggestJobs.mockRejectedValue(error);

    await expect(service.suggest('logs-*', timeRange)).resolves.toBeUndefined();

    expect(service.state).toEqual({ status: 'error', error });
  });

  it('can be loaded again after an error', async () => {
    suggestJobs.mockRejectedValueOnce('failed').mockResolvedValueOnce(response('a'));

    await service.suggest('logs-*', timeRange);
    await service.suggest('logs-*', timeRange);

    expect(service.state.status).toBe('loaded');
  });

  describe('a time range which is not valid', () => {
    it.each([
      ['has no start', { min: undefined, max: moment(2000) }],
      ['has no end', { min: moment(1000), max: undefined }],
      ['ends before it starts', { min: moment(2000), max: moment(1000) }],
      ['is empty', { min: moment(1000), max: moment(1000) }],
    ])('is an error when it %s, and nothing is asked for', async (_, bounds) => {
      calculateBounds.mockReturnValue(bounds);

      await service.suggest('logs-*', timeRange);

      expect(service.state).toEqual({ status: 'error', error: 'The time range is not valid.' });
      expect(suggestJobs).not.toHaveBeenCalled();
    });
  });

  describe('requests which are superseded', () => {
    it('ignores the answer to an earlier request which arrives late', async () => {
      const first = deferred<SuggestJobsResponse>();
      const second = deferred<SuggestJobsResponse>();
      suggestJobs.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

      const firstRequest = service.suggest('logs-*', { from: 'now-7d', to: 'now' });
      const secondRequest = service.suggest('logs-*', { from: 'now-30d', to: 'now' });
      second.resolve(response('second'));
      await secondRequest;
      first.resolve(response('first'));
      await firstRequest;

      expect(service.state).toEqual(
        expect.objectContaining({
          status: 'loaded',
          suggestions: [suggestion('second')],
          timeRange: { from: 'now-30d', to: 'now' },
        })
      );
    });

    it('ignores the error of an earlier request which arrives late', async () => {
      const first = deferred<SuggestJobsResponse>();
      suggestJobs.mockReturnValueOnce(first.promise).mockResolvedValueOnce(response('second'));

      const firstRequest = service.suggest('logs-*', timeRange);
      await service.suggest('logs-*', timeRange);
      first.reject('too late');
      await firstRequest;

      expect(service.state.status).toBe('loaded');
    });

    it('keeps waiting for the latest request while an earlier one answers', async () => {
      const first = deferred<SuggestJobsResponse>();
      const second = deferred<SuggestJobsResponse>();
      suggestJobs.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

      const firstRequest = service.suggest('logs-*', timeRange);
      const secondRequest = service.suggest('metrics-*', timeRange);
      first.resolve(response('first'));
      await firstRequest;

      expect(service.state).toEqual({ status: 'loading' });
      second.resolve(response('second'));
      await secondRequest;
      expect(service.state.status).toBe('loaded');
    });
  });

  describe('cancelling', () => {
    const signalOfCall = (call: number): AbortSignal => suggestJobs.mock.calls[call][1];

    it('lets the request be aborted', async () => {
      suggestJobs.mockResolvedValue(response('a'));

      await service.suggest('logs-*', timeRange);

      expect(signalOfCall(0).aborted).toBe(false);
    });

    it('stops waiting, aborts the request and shows that it was cancelled', async () => {
      const answer = deferred<SuggestJobsResponse>();
      suggestJobs.mockReturnValue(answer.promise);
      const request = service.suggest('logs-*', timeRange);

      service.cancel();

      expect(signalOfCall(0).aborted).toBe(true);
      expect(service.state).toEqual({ status: 'cancelled' });
      answer.resolve(response('a'));
      await request;
    });

    it('ignores the answer which arrives after it was cancelled', async () => {
      const answer = deferred<SuggestJobsResponse>();
      suggestJobs.mockReturnValue(answer.promise);
      const request = service.suggest('logs-*', timeRange);

      service.cancel();
      answer.resolve(response('late'));
      await request;

      expect(service.state).toEqual({ status: 'cancelled' });
    });

    it('does not show the failure of the request which was aborted as an error', async () => {
      suggestJobs.mockImplementation(
        (_params, signal: AbortSignal) =>
          new Promise((_, reject) =>
            signal.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError'))
            )
          )
      );
      const request = service.suggest('logs-*', timeRange);

      service.cancel();
      await request;

      expect(service.state).toEqual({ status: 'cancelled' });
    });

    it('tells observers it was loading and then cancelled', async () => {
      suggestJobs.mockReturnValue(new Promise(() => {}));
      const states: SuggestionsState[] = [];
      service.state$.subscribe((state) => states.push(state));
      void service.suggest('logs-*', timeRange);

      service.cancel();

      expect(states.map(({ status }) => status)).toEqual(['loading', 'loading', 'cancelled']);
    });

    it('does nothing before a request is made', () => {
      service.cancel();

      expect(service.state).toEqual({ status: 'loading' });
    });

    it('does nothing once the suggestions have arrived', async () => {
      suggestJobs.mockResolvedValue(response('a'));
      await service.suggest('logs-*', timeRange);

      service.cancel();

      expect(service.state.status).toBe('loaded');
      expect(signalOfCall(0).aborted).toBe(false);
    });

    it('does nothing once the request has failed', async () => {
      suggestJobs.mockRejectedValue('failed');
      await service.suggest('logs-*', timeRange);

      service.cancel();

      expect(service.state).toEqual({ status: 'error', error: 'failed' });
    });

    it('can ask again after it was cancelled', async () => {
      suggestJobs.mockReturnValueOnce(new Promise(() => {})).mockResolvedValueOnce(response('a'));
      void service.suggest('logs-*', timeRange);
      service.cancel();

      await service.suggest('logs-*', timeRange);

      expect(service.state.status).toBe('loaded');
    });

    it('reloads what was asked for before it was cancelled', async () => {
      suggestJobs.mockReturnValueOnce(new Promise(() => {})).mockResolvedValueOnce(response('a'));
      void service.suggest('metrics-*', { from: 'now-7d', to: 'now' });
      service.cancel();

      await service.reload();

      expect(suggestJobs).toHaveBeenLastCalledWith(
        { index: 'metrics-*', start: 1000, end: 2000 },
        expect.any(AbortSignal)
      );
      expect(service.state.status).toBe('loaded');
    });

    it('aborts the request which is replaced by a new one', async () => {
      suggestJobs.mockReturnValueOnce(new Promise(() => {})).mockResolvedValueOnce(response('a'));
      void service.suggest('logs-*', timeRange);

      await service.suggest('logs-*', timeRange);

      expect(signalOfCall(0).aborted).toBe(true);
      expect(signalOfCall(1).aborted).toBe(false);
    });

    it('aborts the request which is replaced by a time range which is not valid', async () => {
      suggestJobs.mockReturnValue(new Promise(() => {}));
      void service.suggest('logs-*', timeRange);
      calculateBounds.mockReturnValue({ min: undefined, max: undefined });

      await service.suggest('logs-*', timeRange);

      expect(signalOfCall(0).aborted).toBe(true);
      expect(service.state.status).toBe('error');
    });

    it('cancels only the request which is waited for', async () => {
      suggestJobs
        .mockResolvedValueOnce(response('first'))
        .mockReturnValueOnce(new Promise(() => {}));
      await service.suggest('logs-*', timeRange);
      void service.suggest('logs-*', timeRange);

      service.cancel();

      expect(signalOfCall(0).aborted).toBe(false);
      expect(signalOfCall(1).aborted).toBe(true);
    });
  });

  describe('reload', () => {
    it('asks again for what was last asked for', async () => {
      suggestJobs.mockResolvedValue(response('a'));
      await service.suggest('metrics-*', { from: 'now-7d', to: 'now' });

      await service.reload();

      expect(suggestJobs).toHaveBeenCalledTimes(2);
      expect(suggestJobs).toHaveBeenLastCalledWith(
        { index: 'metrics-*', start: 1000, end: 2000 },
        expect.any(AbortSignal)
      );
      expect(calculateBounds).toHaveBeenLastCalledWith({ from: 'now-7d', to: 'now' });
    });

    it('reads the time range again, as a relative range has moved on', async () => {
      suggestJobs.mockResolvedValue(response('a'));
      await service.suggest('logs-*', timeRange);
      calculateBounds.mockReturnValue({ min: moment(3000), max: moment(4000) });

      await service.reload();

      expect(suggestJobs).toHaveBeenLastCalledWith(
        { index: 'logs-*', start: 3000, end: 4000 },
        expect.any(AbortSignal)
      );
    });

    it('does nothing before the first request', async () => {
      await service.reload();

      expect(suggestJobs).not.toHaveBeenCalled();
      expect(service.state).toEqual({ status: 'loading' });
    });
  });
});
