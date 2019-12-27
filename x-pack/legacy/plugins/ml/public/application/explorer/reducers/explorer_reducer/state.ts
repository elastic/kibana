/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ML_RESULTS_INDEX_PATTERN } from '../../../../../common/constants/index_patterns';
import { Dictionary } from '../../../../../common/types/common';

import {
  getDefaultChartsData,
  ExplorerChartsData,
} from '../../explorer_charts/explorer_charts_container_service';
import {
  getDefaultSwimlaneData,
  AnomaliesTableData,
  ExplorerJob,
  AppStateSelectedCells,
  SwimlaneData,
  TimeRangeBounds,
} from '../../explorer_utils';

export interface ExplorerState {
  annotationsData: any[];
  anomalyChartRecords: any[];
  bounds: TimeRangeBounds | undefined;
  chartsData: ExplorerChartsData;
  fieldFormatsLoading: boolean;
  filterActive: boolean;
  filteredFields: any[];
  filterPlaceHolder: any;
  indexPattern: { title: string; fields: any[] };
  influencersFilterQuery: any;
  influencers: Dictionary<any>;
  isAndOperator: boolean;
  loading: boolean;
  maskAll: boolean;
  noInfluencersConfigured: boolean;
  overallSwimlaneData: SwimlaneData;
  queryString: string;
  selectedCells: AppStateSelectedCells | undefined;
  selectedJobs: ExplorerJob[] | null;
  swimlaneBucketInterval: any;
  swimlaneContainerWidth: number;
  swimlaneLimit: number;
  tableData: AnomaliesTableData;
  tableInterval: string;
  tableQueryString: string;
  tableSeverity: number;
  viewByLoadedForTimeFormatted: string | null;
  viewBySwimlaneData: SwimlaneData;
  viewBySwimlaneDataLoading: boolean;
  viewBySwimlaneFieldName?: string;
  viewBySwimlaneOptions: string[];
}

function getDefaultIndexPattern() {
  return { title: ML_RESULTS_INDEX_PATTERN, fields: [] };
}

export function getExplorerDefaultState(): ExplorerState {
  return {
    annotationsData: [],
    anomalyChartRecords: [],
    bounds: undefined,
    chartsData: getDefaultChartsData(),
    fieldFormatsLoading: false,
    filterActive: false,
    filteredFields: [],
    filterPlaceHolder: undefined,
    indexPattern: getDefaultIndexPattern(),
    influencersFilterQuery: undefined,
    influencers: {},
    isAndOperator: false,
    loading: true,
    maskAll: false,
    noInfluencersConfigured: true,
    overallSwimlaneData: getDefaultSwimlaneData(),
    queryString: '',
    selectedCells: undefined,
    selectedJobs: null,
    swimlaneBucketInterval: undefined,
    swimlaneContainerWidth: 0,
    swimlaneLimit: 10,
    tableData: {
      anomalies: [],
      examplesByJobId: [''],
      interval: 0,
      jobIds: [],
      showViewSeriesLink: false,
    },
    tableInterval: 'auto',
    tableQueryString: '',
    tableSeverity: 0,
    viewByLoadedForTimeFormatted: null,
    viewBySwimlaneData: getDefaultSwimlaneData(),
    viewBySwimlaneDataLoading: false,
    viewBySwimlaneFieldName: undefined,
    viewBySwimlaneOptions: [],
  };
}
