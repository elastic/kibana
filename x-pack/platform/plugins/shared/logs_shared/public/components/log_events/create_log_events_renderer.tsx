/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { LazySavedSearchComponent } from '@kbn/saved-search-component';
import {
  buildCustomFilter,
  FilterStateStore,
  fromKueryExpression,
  toElasticsearchQuery,
} from '@kbn/es-query';
import type { LogEventsDependencies, LogEventsProps } from './types';

const DEFAULT_DISPLAY_OPTIONS = {
  solutionNavIdOverride: 'oblt' as const,
  enableDocumentViewer: false,
  enableFilters: false,
};

export const createLogEventsRenderer =
  ({ dataViews, embeddable, searchSource }: LogEventsDependencies) =>
  ({
    query,
    nonHighlightingQuery,
    timeRange,
    index,
    displayOptions = DEFAULT_DISPLAY_OPTIONS,
  }: LogEventsProps) => {
    // Convert user queries to ES filters that will be highlighted
    const documentFilters = useMemo(() => {
      if (!query?.query) {
        return [];
      }

      try {
        const esQuery = toElasticsearchQuery(fromKueryExpression(query.query as string));
        const filter = buildCustomFilter(
          index,
          esQuery,
          false,
          false,
          null,
          FilterStateStore.APP_STATE
        );
        return [filter];
      } catch (err) {
        return [];
      }
    }, [query, index]);

    // Convert context queries to ES filters that won't be highlighted
    const contextFilters = useMemo(() => {
      if (!nonHighlightingQuery?.query) {
        return [];
      }

      try {
        const esQuery = toElasticsearchQuery(
          fromKueryExpression(nonHighlightingQuery.query as string)
        );
        const filter = buildCustomFilter(
          index,
          esQuery,
          false,
          false,
          null,
          FilterStateStore.APP_STATE
        );
        return [filter];
      } catch (err) {
        return [];
      }
    }, [nonHighlightingQuery, index]);

    return (
      <LazySavedSearchComponent
        index={index}
        timeRange={timeRange}
        {...(documentFilters.length > 0 && { filters: documentFilters })}
        {...(contextFilters.length > 0 && { nonHighlightingFilters: contextFilters })}
        displayOptions={displayOptions}
        height="100%"
        dependencies={{
          embeddable,
          searchSource,
          dataViews,
        }}
      />
    );
  };
