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
  /** The request was stopped before the suggestions arrived. */
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
 * A request which is replaced or cancelled is aborted, and its answer is ignored.
 */
export class JobSuggestionService {
  private readonly stateSubject = new BehaviorSubject<SuggestionsState>({ status: 'loading' });
  private lastParams?: { indexPattern: string; timeRange: SuggestionTimeRange };
  /** Aborts the request which is being waited for, and tells it apart from earlier ones. */
  private abortController?: AbortController;

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
    this.abortInFlight();
    this.lastParams = { indexPattern, timeRange };

    const bounds = this.getBounds(timeRange);
    if (bounds === undefined) {
      this.stateSubject.next({
        status: 'error',
        error: i18n.translate('xpack.ml.suggestADJobsFlyout.invalidTimeRangeError', {
          defaultMessage: 'The time range is not valid.',
        }),
      });
      return;
    }

    const controller = new AbortController();
    this.abortController = controller;
    this.stateSubject.next({ status: 'loading' });

    const settle = (state: SuggestionsState) => {
      if (this.abortController !== controller) return;
      this.abortController = undefined;
      this.stateSubject.next(state);
    };

    try {
      const { suggestions } = await this.jobsApi.suggestJobs(
        { index: indexPattern, ...bounds },
        controller.signal
      );
      settle({ status: 'loaded', suggestions, timeRange, ranAt: Date.now() });
    } catch (error) {
      settle({ status: 'error', error });
    }
  }

  /**
   * Stops waiting for the request which is in progress, and tells the server to stop its work.
   * Does nothing when there is no request in progress.
   */
  public cancel(): void {
    if (this.abortController === undefined) return;
    this.abortInFlight();
    this.stateSubject.next({ status: 'cancelled' });
  }

  /** Asks again, for what was last asked for. Does nothing before the first request. */
  public async reload(): Promise<void> {
    if (this.lastParams === undefined) return;
    await this.suggest(this.lastParams.indexPattern, this.lastParams.timeRange);
  }

  private abortInFlight(): void {
    this.abortController?.abort();
    this.abortController = undefined;
  }

  /** The time range as times, or nothing when it is not a valid range. */
  private getBounds(timeRange: SuggestionTimeRange): { start: number; end: number } | undefined {
    const { min, max } = this.timefilter.calculateBounds(timeRange);
    const start = min?.valueOf();
    const end = max?.valueOf();
    return start !== undefined && end !== undefined && start < end ? { start, end } : undefined;
  }
}
