/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QualityIssueSortField } from '../../hooks';
import type { DatasetQualityDetailsControllerContext } from '../../state_machines/dataset_quality_details_controller';
import { DEFAULT_CONTEXT } from '../../state_machines/dataset_quality_details_controller';
import type {
  DatasetQualityDetailsPublicState,
  DatasetQualityDetailsPublicStateUpdate,
} from './types';

export const getPublicStateFromContext = (
  context: DatasetQualityDetailsControllerContext
): DatasetQualityDetailsPublicState => {
  return {
    dataStream: context.dataStream,
    qualityIssues: context.qualityIssues,
    failedDocsErrors: context.failedDocsErrors,
    timeRange: context.timeRange,
    breakdownField: context.breakdownField,
    qualityIssuesChart: context.qualityIssuesChart,
    integration: context.integration,
    expandedQualityIssue: context.expandedQualityIssue,
    showCurrentQualityIssues: context.showCurrentQualityIssues,
    view: context.view,
    selectedIssueTypes: context.selectedIssueTypes,
    selectedFields: context.selectedFields,
    streamDefinition: context.streamDefinition,
    streamsUrls: context.streamsUrls,
  };
};

export const getContextFromPublicState = (
  publicState: DatasetQualityDetailsPublicStateUpdate
): DatasetQualityDetailsControllerContext => ({
  ...DEFAULT_CONTEXT,
  qualityIssues: {
    table: {
      ...DEFAULT_CONTEXT.qualityIssues.table,
      ...publicState.qualityIssues?.table,
      sort: publicState.qualityIssues?.table?.sort
        ? {
            ...publicState.qualityIssues.table.sort,
            field: publicState.qualityIssues.table.sort.field as QualityIssueSortField,
          }
        : DEFAULT_CONTEXT.qualityIssues.table.sort,
    },
  },
  timeRange: {
    ...DEFAULT_CONTEXT.timeRange,
    ...publicState.timeRange,
    refresh: {
      ...DEFAULT_CONTEXT.timeRange.refresh,
      ...publicState.timeRange?.refresh,
    },
  },
  dataStream: publicState.dataStream,
  breakdownField: publicState.breakdownField,
  qualityIssuesChart: publicState.qualityIssuesChart ?? DEFAULT_CONTEXT.qualityIssuesChart,
  expandedQualityIssue: publicState.expandedQualityIssue,
  showCurrentQualityIssues:
    publicState.showCurrentQualityIssues ?? DEFAULT_CONTEXT.showCurrentQualityIssues,
  view: publicState.view ?? DEFAULT_CONTEXT.view,
  selectedIssueTypes: publicState.selectedIssueTypes ?? DEFAULT_CONTEXT.selectedIssueTypes,
  selectedFields: publicState.selectedFields ?? DEFAULT_CONTEXT.selectedFields,
  streamDefinition: publicState.streamDefinition,
  streamsUrls: publicState.streamsUrls,
});
