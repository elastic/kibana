/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { Observable } from 'rxjs';
import { i18n } from '@kbn/i18n';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { ErrorType } from '@kbn/ml-error-utils';
import type { JobSuggestion } from '../../../../common/types/job_suggestions';
import type { jobsApiProvider } from '../../../application/services/ml_api_service/jobs';

export interface SuggestionTimeRange {
  from: string;
  to: string;
}

export const DEFAULT_SUGGESTION_TIME_RANGE: SuggestionTimeRange = { from: 'now-30d', to: 'now' };

export type SuggestionsState =
  | { status: 'loading' }
  | { status: 'cancelled' }
  | { status: 'error'; error: ErrorType }
  | {
      status: 'loaded';
      suggestions: JobSuggestion[];
      /** The time range which was asked for, and when the answer arrived. */
      timeRange: SuggestionTimeRange;
      ranAt: number;
    };

type JobsApi = Pick<ReturnType<typeof jobsApiProvider>, 'suggestJobs'>;
type Timefilter = Pick<TimefilterContract, 'calculateBounds'>;

/**
 * Asks for suggested jobs, and keeps the state of the latest request.
 * The answer to a request which has been superseded is ignored.
 */
export class JobSuggestionService {
  private readonly stateSubject = new BehaviorSubject<SuggestionsState>({ status: 'loading' });
  private latestRequest = 0;
  /** Cancels the request which is being waited for. */
  private abortController?: AbortController;
  private lastParams?: { indexPattern: string; timeRange: SuggestionTimeRange };

  /** The state of the latest request, which is loading until the first request is made. */
  public readonly state$: Observable<SuggestionsState> = this.stateSubject.asObservable();

  constructor(private readonly jobsApi: JobsApi, private readonly timefilter: Timefilter) {}

  public get state(): SuggestionsState {
    return this.stateSubject.getValue();
  }

  /**
   * Asks for suggestions for an index pattern over a time range.
   * The returned promise settles once the state has been updated, and never rejects.
   */
  public async suggest(indexPattern: string, timeRange: SuggestionTimeRange): Promise<void> {
    // A request which is waited for is replaced, and so is no longer needed.
    this.abortController?.abort();
    this.abortController = undefined;

    const requestId = ++this.latestRequest;
    const isCurrent = () => requestId === this.latestRequest;
    this.lastParams = { indexPattern, timeRange };

    const { min, max } = this.timefilter.calculateBounds(timeRange);
    const start = min?.valueOf();
    const end = max?.valueOf();
    if (start === undefined || end === undefined || start >= end) {
      this.stateSubject.next({
        status: 'error',
        error: i18n.translate('xpack.ml.suggestADJobsFlyout.invalidTimeRangeError', {
          defaultMessage: 'The time range is not valid.',
        }),
      });
      return;
    }

    const abortController = new AbortController();
    this.abortController = abortController;
    this.stateSubject.next({ status: 'loading' });
    try {
      const { suggestions } = await this.jobsApi.suggestJobs(
        { index: indexPattern, start, end },
        abortController.signal
      );
      if (isCurrent()) {
        this.abortController = undefined;
        this.stateSubject.next({ status: 'loaded', suggestions, timeRange, ranAt: Date.now() });
      }
    } catch (error) {
      if (isCurrent()) {
        this.abortController = undefined;
        this.stateSubject.next({ status: 'error', error });
      }
    }
  }

  /**
   * Stops waiting for the request which is in progress, and tells the server to stop its work.
   * Does nothing when there is no request in progress.
   */
  public cancel(): void {
    if (this.abortController === undefined) return;
    this.latestRequest++;
    this.abortController.abort();
    this.abortController = undefined;
    this.stateSubject.next({ status: 'cancelled' });
  }

  /** Asks again, for what was last asked for. Does nothing before the first request. */
  public async reload(): Promise<void> {
    if (this.lastParams === undefined) return;
    const { indexPattern, timeRange } = this.lastParams;
    await this.suggest(indexPattern, timeRange);
  }
}
