/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import {
  BehaviorSubject,
  combineLatest,
  startWith,
  map,
  switchMap,
  Subscription,
  from,
  skipWhile,
} from 'rxjs';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { TimeRangeBounds } from '@kbn/ml-time-buckets';
import { mlTimefilterRefresh$ } from '@kbn/ml-date-picker';
import type { InfluencersFilterQuery } from '@kbn/ml-anomaly-utils';
import type { MlApi } from '../services/ml_api_service';
import type {
  GetTopInfluencersRequest,
  InfluencersByFieldResponse,
} from '../../../common/types/results';
import { StateService } from '../services/state_service';
import type { AnomalyExplorerCommonStateService } from './anomaly_explorer_common_state';
import type { AnomalyTimelineStateService } from './anomaly_timeline_state_service';
import type { ExplorerJob, AppStateSelectedCells } from './explorer_utils';
import { MAX_INFLUENCER_FIELD_VALUES } from './explorer_constants';
import {
  getSelectionInfluencers,
  getSelectionJobIds,
  getSelectionTimeRange,
} from './explorer_utils';

export type InfluencersByField = Record<
  string,
  Array<{ influencerFieldValue: string; maxAnomalyScore: number; sumAnomalyScore: number }>
>;

export class InfluencersStateService extends StateService {
  private readonly _influencers$ = new BehaviorSubject<InfluencersByField>({});
  private readonly _isLoading$ = new BehaviorSubject<boolean>(true);

  private readonly _timeBounds$: Observable<TimeRangeBounds>;
  private readonly _refresh$ = mlTimefilterRefresh$.pipe(startWith({ lastRefresh: 0 }));

  constructor(
    private readonly mlApi: MlApi,
    private readonly timefilter: TimefilterContract,
    private readonly anomalyExplorerCommonStateService: AnomalyExplorerCommonStateService,
    private readonly anomalyTimelineStateService: AnomalyTimelineStateService
  ) {
    super();

    this._timeBounds$ = this.timefilter.getTimeUpdate$().pipe(
      startWith(null),
      map(() => this.timefilter.getBounds())
    );

    this._init();
  }

  public get influencers$(): Observable<InfluencersByField> {
    return this._influencers$.asObservable();
  }

  public get influencers(): InfluencersByField {
    return this._influencers$.getValue();
  }

  public get isLoading$(): Observable<boolean> {
    return this._isLoading$.asObservable();
  }

  protected _initSubscriptions(): Subscription {
    const subscription = new Subscription();

    subscription.add(
      combineLatest<
        [
          ExplorerJob[],
          AppStateSelectedCells | undefined | null,
          string | undefined,
          InfluencersFilterQuery | undefined,
          TimeRangeBounds,
          { lastRefresh: number }
        ]
      >([
        this.anomalyExplorerCommonStateService.selectedJobs$,
        this.anomalyTimelineStateService.getSelectedCells$(),
        this.anomalyTimelineStateService.getViewBySwimlaneFieldName$(),
        this.anomalyExplorerCommonStateService.influencerFilterQuery$,
        this._timeBounds$,
        this._refresh$,
      ])
        .pipe(
          // selectedCells is initially undefined, so we skip until it's loaded
          skipWhile(([, selectedCells]) => selectedCells === undefined),
          switchMap(([selectedJobs, selectedCells, viewByFieldName, influencersFilterQuery]) => {
            const selectionInfluencers = getSelectionInfluencers(selectedCells, viewByFieldName!);

            const jobIds = getSelectionJobIds(selectedCells, selectedJobs);
            const timerange = getSelectionTimeRange(selectedCells, this.timefilter.getBounds());

            this._isLoading$.next(true);

            return this._getTopInfluencers({
              jobIds,
              earliestMs: timerange.earliestMs,
              latestMs: timerange.latestMs,
              influencers: selectionInfluencers.map((s) => ({
                fieldName: s.fieldName,
                fieldValue: String(s.fieldValue ?? ''),
              })),
              influencersFilterQuery,
            });
          })
        )
        .subscribe(({ influencers }) => {
          this._influencers$.next(influencers);
          this._isLoading$.next(false);
        })
    );

    return subscription;
  }

  private _getTopInfluencers({
    jobIds,
    earliestMs,
    latestMs,
    influencers,
    influencersFilterQuery,
  }: Pick<
    GetTopInfluencersRequest,
    'jobIds' | 'earliestMs' | 'latestMs' | 'influencers' | 'influencersFilterQuery'
  >) {
    const payload = {
      jobIds,
      earliestMs,
      latestMs,
      maxFieldValues: MAX_INFLUENCER_FIELD_VALUES,
      ...(Array.isArray(influencers) && influencers.length > 0 ? { influencers } : {}),
      ...(influencersFilterQuery ? { influencersFilterQuery } : {}),
    };

    return from(this.mlApi.results.getTopInfluencers(payload)).pipe(
      map((response: InfluencersByFieldResponse) => ({ influencers: response }))
    );
  }
}
