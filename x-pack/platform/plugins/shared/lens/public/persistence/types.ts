/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregateQuery, Filter, Query } from '@kbn/es-query';
import type { Reference } from '@kbn/content-management-utils';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';

export interface LensDocument {
  savedObjectId?: string;
  type?: string;
  visualizationType: string | null;
  title: string;
  description?: string;
  state: {
    datasourceStates: Record<string, unknown>;
    visualization: unknown;
    query: Query | AggregateQuery;
    globalPalette?: {
      activePaletteId: string;
      state?: unknown;
    };
    filters: Filter[];
    needsRefresh?: boolean;
    adHocDataViews?: Record<string, DataViewSpec>;
    internalReferences?: Reference[];
  };
  references: Reference[];
}
