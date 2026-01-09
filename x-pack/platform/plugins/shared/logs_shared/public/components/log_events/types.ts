/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ISearchStartSearchSource } from '@kbn/data-plugin/public';
import { type DataViewsContract } from '@kbn/data-views-plugin/public';
import { type EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { Query, TimeRange } from '@kbn/es-query';

export interface LogEventsDependencies {
  embeddable: EmbeddableStart;
  dataViews: DataViewsContract;
  searchSource: ISearchStartSearchSource;
}

export interface LogEventsProps {
  query?: Query;
  timeRange: TimeRange;
  index: string;
  // Query for context filters that shouldn't trigger highlighting (e.g., trace IDs, span IDs)
  nonHighlightingQuery?: Query;
  displayOptions?: {
    solutionNavIdOverride?: 'oblt' | 'security' | 'search';
    enableDocumentViewer?: boolean;
    enableFilters?: boolean;
  };
}
