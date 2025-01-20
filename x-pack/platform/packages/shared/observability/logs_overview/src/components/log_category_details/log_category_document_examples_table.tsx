/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { LazySavedSearchComponent } from '@kbn/saved-search-component';
import { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import { DataViewsContract } from '@kbn/data-views-plugin/public';
import { ISearchStartSearchSource } from '@kbn/data-plugin/common';
import { Filter } from '@kbn/es-query';
import { ResolvedIndexNameLogsSourceConfiguration } from '../../utils/logs_source';

export interface LogCategoryDocumentExamplesTableDependencies {
  embeddable: EmbeddableStart;
  dataViews: DataViewsContract;
  searchSource: ISearchStartSearchSource;
}

export interface LogCategoryDocumentExamplesTableProps {
  dependencies: LogCategoryDocumentExamplesTableDependencies;
  logsSource: ResolvedIndexNameLogsSourceConfiguration;
  filters: Filter[];
}

export const LogCategoryDocumentExamplesTable: React.FC<LogCategoryDocumentExamplesTableProps> = ({
  dependencies,
  filters,
  logsSource,
}) => {
  return (
    <LazySavedSearchComponent
      dependencies={{
        embeddable: dependencies.embeddable,
        dataViews: dependencies.dataViews,
        searchSource: dependencies.searchSource,
      }}
      filters={filters}
      index={logsSource.indexName}
      timestampField={logsSource.timestampField}
      displayOptions={{
        solutionNavIdOverride: 'oblt',
        enableDocumentViewer: false,
        enableFilters: false,
      }}
    />
  );
};
