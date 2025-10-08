/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregateQuery, Filter, Query } from '@kbn/es-query';
import type { Reference } from '@kbn/content-management-utils';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';
import type { LENS_ITEM_LATEST_VERSION } from '../../common/constants';

export interface LensDocument {
  savedObjectId?: string;
  type?: string;
  title: string;
  description?: string;
  visualizationType: string | null;
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
  version?: LENS_ITEM_LATEST_VERSION;
}
