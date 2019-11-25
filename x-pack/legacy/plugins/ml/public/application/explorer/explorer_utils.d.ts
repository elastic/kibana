/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Moment } from 'moment';

import { CombinedJob } from '../jobs/new_job/common/job_creator/configs';

import { TimeBucketsInterval } from '../util/time_buckets';

interface ClearedSelectedAnomaliesState {
  anomalyChartRecords: [];
  selectedCells: null;
  viewByLoadedForTimeFormatted: null;
}

export declare const getClearedSelectedAnomaliesState: () => ClearedSelectedAnomaliesState;

export declare interface SwimlaneData {
  fieldName: string;
  laneLabels: string[];
  points: any[];
  interval: number;
}

export declare interface OverallSwimlaneData extends SwimlaneData {
  earliest: number;
  latest: number;
}

export declare const getDefaultViewBySwimlaneData: () => SwimlaneData;

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

declare interface SwimlaneBounds {
  earliest: number;
  latest: number;
}

declare interface LoadOverallDataResponse {
  hasResults: boolean;
  loading: boolean;
  overallSwimlaneData: OverallSwimlaneData;
}

export declare const loadOverallData: (
  selectedJobs: ExplorerJob[],
  interval: TimeBucketsInterval,
  bounds: TimeRangeBounds
) => Promise<LoadOverallDataResponse>;

export declare const loadViewBySwimlane: (
  fieldValues: string[],
  bounds: SwimlaneBounds,
  selectedJobs: ExplorerJob[],
  viewBySwimlaneFieldName: string,
  swimlaneLimit: number,
  influencersFilterQuery: any,
  noInfluencersConfigured: boolean
) => Promise<any>;

export declare const loadViewByTopFieldValuesForSelectedTime: (
  earliestMs: number,
  latestMs: number,
  selectedJobs: ExplorerJob[],
  viewBySwimlaneFieldName: string,
  swimlaneLimit: number,
  noInfluencersConfigured: boolean
) => Promise<any>;

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
