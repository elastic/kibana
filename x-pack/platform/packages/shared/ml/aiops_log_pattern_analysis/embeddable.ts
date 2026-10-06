/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedSearch, VIEW_MODE } from '@kbn/saved-search-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { Query, TimeRange } from '@kbn/es-query';

export interface EmbeddablePatternAnalysisInput {
  dataView: DataView;
  savedSearch?: Pick<SavedSearch, 'searchSource'> | null;
  embeddingOrigin?: string;
  switchToDocumentView?: () => Promise<VIEW_MODE>;
  lastReloadRequestTime?: number;
  /** Query of the embedding context, e.g. a dashboard, combined with the saved search's own query. */
  query?: Query;
  /** Time range of the embedding context; overrides the global time filter when set. */
  timeRange?: TimeRange;
}
