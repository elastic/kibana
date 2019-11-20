/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Moment } from 'moment';

import { CombinedJob } from '../jobs/new_job/common/job_creator/configs';

import { TimeBucketsInterval } from '../util/time_buckets';

declare interface DefaultViewBySwimlaneData {
  fieldName: string;
  laneLabels: string[];
  points: any[];
  interval: number;
}

export declare const getDefaultViewBySwimlaneData: () => DefaultViewBySwimlaneData;

export declare const getInfluencers: (selectedJobs: any[]) => string[];

export declare interface ExplorerJob {
  id: string;
  selected: boolean;
  bucketSpanSeconds: number;
}

export declare const createJobs: (jobs: CombinedJob[]) => ExplorerJob[];

export declare interface TimeRangeBounds {
  min: Moment | undefined;
  max: Moment | undefined;
}

declare interface LoadOverallDataResponse {
  hasResults: boolean;
  loading: boolean;
  overallSwimlaneData: any;
}

export declare const loadOverallData: (
  selectedJobs: ExplorerJob[],
  interval: TimeBucketsInterval,
  bounds: TimeRangeBounds
) => Promise<LoadOverallDataResponse>;

declare interface FilterData {
  influencersFilterQuery: any;
  filterActive: boolean;
  filteredFields: string[];
  queryString: string;
}

declare interface RestoredAppState {
  selectedCells?: {
    type: string;
    lanes: string[];
    times: number[];
    showTopFieldValues: boolean;
    viewByFieldName: string;
  };
  filterData: {} | FilterData;
}
export declare const restoreAppState: (appState: any) => RestoredAppState;
