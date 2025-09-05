/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { LazySavedSearchComponent } from '@kbn/saved-search-component';
import type { LogEventsDependencies, LogEventsProps } from './types';

const DEFAULT_DISPLAY_OPTIONS = {
  solutionNavIdOverride: 'oblt' as const,
  enableDocumentViewer: false,
  enableFilters: false,
};

export const createLogEventsRenderer =
  ({ dataViews, embeddable, searchSource }: LogEventsDependencies) =>
  ({ query, timeRange, index, displayOptions = DEFAULT_DISPLAY_OPTIONS }: LogEventsProps) => {
    return (
      <LazySavedSearchComponent
        query={query}
        index={index}
        timeRange={timeRange}
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
