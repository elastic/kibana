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
  lastValueFrom,
} from 'rxjs';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { TimeRangeBounds } from '@kbn/ml-time-buckets';
import { mlTimefilterRefresh$ } from '@kbn/ml-date-picker';
import { extractErrorMessage } from '@kbn/ml-error-utils';
import type { AnnotationsTable } from '../../../common/types/annotations';
import type { Annotations } from '../../../common/types/annotations';
import type { AnomalyExplorerCommonStateService } from './anomaly_explorer_common_state';
import type { AnomalyTimelineStateService } from './anomaly_timeline_state_service';
import type { MlApi } from '../services/ml_api_service';
import { StateService } from '../services/state_service';
import { ANNOTATIONS_TABLE_DEFAULT_QUERY_SIZE } from '../../../common/constants/search';
import { getSelectionTimeRange, type ExplorerJob } from './explorer_utils';
import { loadAnnotationsTableData } from './explorer_utils';
import type { Refresh } from '../routing/use_refresh';

/**
 * Dedicated state service for annotations.
 * - overallAnnotations$ drives the swimlane overlay
 * - annotationsTable$ drives the Annotations panel
 */
export class AnnotationsStateService extends StateService {
  private readonly _overallAnnotations$ = new BehaviorSubject<AnnotationsTable>({
    annotationsData: [],
    error: undefined,
  });

  private readonly _annotationsTable$ = new BehaviorSubject<AnnotationsTable>({
    annotationsData: [],
    totalCount: 0,
    error: undefined,
  });

  private readonly _timeBounds$: Observable<TimeRangeBounds>;
  private readonly _refreshSubject$: Observable<Refresh>;

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
    this._refreshSubject$ = mlTimefilterRefresh$.pipe(startWith({ lastRefresh: 0 }));

    this._init();
  }

  public get overallAnnotations$(): Observable<AnnotationsTable> {
    return this._overallAnnotations$.asObservable();
  }

  public get annotationsTable$(): Observable<AnnotationsTable> {
    return this._annotationsTable$.asObservable();
  }

  public get overallAnnotations(): AnnotationsTable {
    return this._overallAnnotations$.getValue();
  }

  public get annotationsTable(): AnnotationsTable {
    return this._annotationsTable$.getValue();
  }

  protected _initSubscriptions(): Subscription {
    const subscription = new Subscription();

    // Overall annotations react to selected jobs, time bounds and manual refreshes
    subscription.add(
      combineLatest([
        this.anomalyExplorerCommonStateService.selectedJobs$,
        this._timeBounds$,
        this._refreshSubject$,
      ])
        .pipe(
          switchMap(([selectedJobs, bounds]) => {
            return this._loadOverallAnnotations(selectedJobs, bounds);
          })
        )
        .subscribe(this._overallAnnotations$)
    );

    // Annotations table reacts to selected cells, selected jobs, time bounds and refreshes
    subscription.add(
      combineLatest([
        this.anomalyTimelineStateService.getSelectedCells$(),
        this.anomalyExplorerCommonStateService.selectedJobs$,
        this._timeBounds$,
        this._refreshSubject$,
      ])
        .pipe(
          switchMap(([selectedCells, selectedJobs, bounds]) =>
            loadAnnotationsTableData(
              this.mlApi,
              selectedCells,
              selectedJobs,
              bounds as Required<TimeRangeBounds>
            )
          )
        )
        .subscribe(this._annotationsTable$)
    );

    return subscription;
  }
  private _loadOverallAnnotations(
    selectedJobs: ExplorerJob[],
    bounds: TimeRangeBounds
  ): Promise<AnnotationsTable> {
    const jobIds = selectedJobs.map((d) => d.id);
    const timeRange = getSelectionTimeRange(undefined, bounds);

    return new Promise((resolve) => {
      lastValueFrom(
        this.mlApi.annotations.getAnnotations$({
          jobIds,
          earliestMs: timeRange.earliestMs,
          latestMs: timeRange.latestMs,
          maxAnnotations: ANNOTATIONS_TABLE_DEFAULT_QUERY_SIZE,
        })
      )
        .then((resp) => {
          if (resp.error !== undefined || resp.annotations === undefined) {
            const errorMessage = extractErrorMessage(resp.error);
            return resolve({
              annotationsData: [],
              error: errorMessage !== '' ? errorMessage : undefined,
            });
          }

          const annotationsData: Annotations = [];
          jobIds.forEach((jobId: string) => {
            const jobAnnotations = resp.annotations[jobId];
            if (jobAnnotations !== undefined) {
              annotationsData.push(...jobAnnotations);
            }
          });

          return resolve({
            annotationsData: annotationsData
              .sort((a, b) => {
                return a.timestamp - b.timestamp;
              })
              .map((d, i) => {
                d.key = (i + 1).toString();
                return d;
              }),
          });
        })
        .catch((resp) => {
          const errorMessage = extractErrorMessage(resp);
          return resolve({
            annotationsData: [],
            error: errorMessage !== '' ? errorMessage : undefined,
          });
        });
    });
  }
}
