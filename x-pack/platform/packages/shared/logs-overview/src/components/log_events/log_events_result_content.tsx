/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { type ISearchStartSearchSource } from '@kbn/data-plugin/public';
import { type DataViewsContract } from '@kbn/data-views-plugin/public';
import { type EmbeddableStart } from '@kbn/embeddable-plugin/public';
import { LazySavedSearchComponent } from '@kbn/saved-search-component';
import React from 'react';
import { FilterStateStore, buildCustomFilter } from '@kbn/es-query';
import type { ResolvedIndexNameLogsSourceConfiguration } from '../../utils/logs_source';

export interface LogEventsResultContentProps {
  dependencies: LogEventsResultContentDependencies;
  documentFilters: QueryDslQueryContainer[];
  nonHighlightingFilters?: QueryDslQueryContainer[];
  logsSource: ResolvedIndexNameLogsSourceConfiguration;
  timeRange: {
    start: string;
    end: string;
  };
}

export interface LogEventsResultContentDependencies {
  embeddable: EmbeddableStart;
  dataViews: DataViewsContract;
  searchSource: ISearchStartSearchSource;
}

export const LogEventsResultContent = React.memo<LogEventsResultContentProps>(
  ({ dependencies, documentFilters, nonHighlightingFilters = [], logsSource, timeRange }) => {
    const savedSearchDependencies = React.useMemo(
      () => ({
        embeddable: dependencies.embeddable,
        searchSource: dependencies.searchSource,
        dataViews: dependencies.dataViews,
      }),
      [dependencies.embeddable, dependencies.searchSource, dependencies.dataViews]
    );

    const savedSearchTimeRange = React.useMemo(
      () => ({
        from: timeRange.start,
        to: timeRange.end,
      }),
      [timeRange.start, timeRange.end]
    );

    const savedSearchFilters = React.useMemo(
      () =>
        documentFilters.map((filter) =>
          buildCustomFilter(
            logsSource.indexName,
            filter,
            false,
            false,
            'Document Filters',
            FilterStateStore.APP_STATE
          )
        ),
      [documentFilters, logsSource.indexName]
    );

    const savedSearchNonHighlightingFilters = React.useMemo(
      () =>
        nonHighlightingFilters.map((filter) =>
          buildCustomFilter(
            logsSource.indexName,
            filter,
            false,
            false,
            'Context Filters',
            FilterStateStore.APP_STATE
          )
        ),
      [nonHighlightingFilters, logsSource.indexName]
    );

    return (
      <LazySavedSearchComponent
        dependencies={savedSearchDependencies}
        index={logsSource.indexName}
        timestampField={logsSource.timestampField}
        timeRange={savedSearchTimeRange}
        filters={savedSearchFilters}
        nonHighlightingFilters={savedSearchNonHighlightingFilters}
        displayOptions={{
          solutionNavIdOverride: 'oblt',
          enableDocumentViewer: true,
          enableFilters: false,
        }}
      />
    );
  }
);
