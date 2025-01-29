/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { Subscription } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import { distinctUntilChanged, map, shareReplay, filter } from 'rxjs';
import { isEqual } from 'lodash';
import type { InfluencersFilterQuery } from '@kbn/ml-anomaly-utils';
import type { GlobalState, UrlStateService } from '@kbn/ml-url-state/src/url_state';
import { createJobs, type ExplorerJob } from './explorer_utils';
import type { AnomalyExplorerUrlStateService } from './hooks/use_explorer_url_state';
import type { AnomalyExplorerFilterUrlState } from '../../../common/types/locator';
import type { KQLFilterSettings } from './components/explorer_query_bar/explorer_query_bar';
import { StateService } from '../services/state_service';
import type { MlJobService } from '../services/job_service';
import type { GroupObj } from '../components/job_selector/job_selector';

export interface AnomalyExplorerState {
  selectedJobs: ExplorerJob[];
}

export type FilterSettings = Required<
  Pick<AnomalyExplorerFilterUrlState, 'filterActive' | 'filteredFields' | 'queryString'>
> &
  Pick<AnomalyExplorerFilterUrlState, 'influencersFilterQuery'>;

/**
 * Anomaly Explorer common state.
 * Manages related values in the URL state and applies required formatting.
 */
export class AnomalyExplorerCommonStateService extends StateService {
  private _selectedJobs$ = new BehaviorSubject<ExplorerJob[]>([]);
  private _selectedGroups$ = new BehaviorSubject<GroupObj[]>([]);
  private _filterSettings$ = new BehaviorSubject<FilterSettings>(this._getDefaultFilterSettings());
  private _invalidJobIds$ = new BehaviorSubject<string[]>([]);

  private _getDefaultFilterSettings(): FilterSettings {
    return {
      filterActive: false,
      filteredFields: [],
      queryString: '',
      influencersFilterQuery: undefined,
    };
  }

  constructor(
    private anomalyExplorerUrlStateService: AnomalyExplorerUrlStateService,
    private globalUrlStateService: UrlStateService<GlobalState>,
    private mlJobsService: MlJobService
  ) {
    super();
    this._init();
  }

  public readonly selectedGroups$: Observable<GroupObj[]> = this._selectedGroups$.pipe(
    distinctUntilChanged(isEqual),
    shareReplay(1)
  );

  public readonly invalidJobIds$: Observable<string[]> = this._invalidJobIds$.pipe(
    distinctUntilChanged(isEqual),
    shareReplay(1)
  );

  public readonly selectedJobs$: Observable<ExplorerJob[]> = this._selectedJobs$.pipe(
    filter((v) => Array.isArray(v) && v.length > 0),
    distinctUntilChanged(isEqual),
    shareReplay(1)
  );

  public readonly influencerFilterQuery$: Observable<InfluencersFilterQuery | undefined> =
    this._filterSettings$.pipe(
      map((v) => v?.influencersFilterQuery),
      distinctUntilChanged(isEqual)
    );

  public readonly filterSettings$ = this._filterSettings$.asObservable();

  public get selectedGroups(): GroupObj[] {
    return this._selectedGroups$.getValue();
  }

  public get invalidJobIds(): string[] {
    return this._invalidJobIds$.getValue();
  }

  public get selectedJobs(): ExplorerJob[] {
    return this._selectedJobs$.getValue();
  }

  public get filterSettings(): FilterSettings {
    return this._filterSettings$.getValue();
  }

  protected _initSubscriptions(): Subscription {
    const subscriptions = new Subscription();

    subscriptions.add(
      this.anomalyExplorerUrlStateService
        .getUrlState$()
        .pipe(
          map((urlState) => urlState?.mlExplorerFilter),
          distinctUntilChanged(isEqual)
        )
        .subscribe((v) => {
          const result = {
            ...this._getDefaultFilterSettings(),
            ...v,
          };
          this._filterSettings$.next(result);
        })
    );

    subscriptions.add(
      this.globalUrlStateService
        .getUrlState$()
        .pipe(
          map((urlState) => urlState?.ml?.jobIds),
          distinctUntilChanged(isEqual)
        )
        .subscribe((selectedJobIds: string[]) => {
          this._processSelectedJobs(selectedJobIds);
        })
    );

    return subscriptions;
  }

  private _processSelectedJobs(selectedJobIds: string[]) {
    if (!selectedJobIds || selectedJobIds.length === 0) {
      this._selectedJobs$.next([]);
      this._invalidJobIds$.next([]);
      this._selectedGroups$.next([]);
      return;
    }
    // TODO: We are using mlJobService jobs, which has stale data.

    const groupIds = selectedJobIds.filter((id) =>
      this.mlJobsService.jobs.some((job) => job.groups?.includes(id))
    );

    const selectedGroups = groupIds.map((groupId) => ({
      groupId,
      jobIds: this.mlJobsService.jobs
        .filter((job) => job.groups?.includes(groupId))
        .map((job) => job.job_id),
    }));

    const selectedJobs = this.mlJobsService.jobs.filter(
      (j) => selectedJobIds.includes(j.job_id) || j.groups?.some((g) => groupIds.includes(g))
    );

    const mappedJobs = createJobs(selectedJobs);

    const invalidJobIds = this._getInvalidJobIds(selectedJobIds);

    this._invalidJobIds$.next(invalidJobIds);
    this._selectedJobs$.next(mappedJobs);
    this._selectedGroups$.next(selectedGroups);
  }

  private _getInvalidJobIds(jobIds: string[]): string[] {
    return jobIds.filter(
      (id) => !this.mlJobsService.jobs.some((j) => j.job_id === id || j.groups?.includes(id))
    );
  }

  public setSelectedJobs(jobIds: string[], time?: { from: string; to: string }) {
    this.globalUrlStateService.updateUrlState({
      ml: {
        jobIds,
      },
      ...(time ? { time } : {}),
    });
  }

  public setFilterSettings(update: KQLFilterSettings) {
    this.anomalyExplorerUrlStateService.updateUrlState({
      mlExplorerFilter: {
        influencersFilterQuery: update.filterQuery,
        filterActive: true,
        filteredFields: update.filteredFields,
        queryString: update.queryString,
      },
    });
  }

  public clearFilterSettings() {
    this.anomalyExplorerUrlStateService.updateUrlState({ mlExplorerFilter: {} });
  }
}
