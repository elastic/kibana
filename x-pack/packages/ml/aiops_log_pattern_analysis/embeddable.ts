/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Query, AggregateQuery, Filter } from '@kbn/es-query';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';

export interface EmbeddablePatternAnalysisInput<T = Query | AggregateQuery> {
  dataView: DataView;
  savedSearch?: SavedSearch | null;
  query?: T;
  filters?: Filter[];
  embeddingOrigin?: string;
  switchToDocumentView?: () => void;
  lastReloadRequestTime?: number;
}
