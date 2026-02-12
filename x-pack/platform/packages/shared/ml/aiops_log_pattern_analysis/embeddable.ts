/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedSearch, VIEW_MODE } from '@kbn/saved-search-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';

export interface EmbeddablePatternAnalysisInput {
  dataView: DataView;
  savedSearch?: Pick<SavedSearch, 'searchSource'> | null;
  embeddingOrigin?: string;
  switchToDocumentView?: () => Promise<VIEW_MODE>;
  lastReloadRequestTime?: number;
}
