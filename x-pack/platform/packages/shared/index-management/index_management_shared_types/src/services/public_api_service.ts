/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EnrichPolicyType } from '@elastic/elasticsearch/lib/api/types';
import type { SendRequestResponse } from '../types';

export interface SerializedEnrichPolicy {
  type: EnrichPolicyType;
  name: string;
  sourceIndices: string[];
  matchField: string;
  enrichFields: string[];
  query?: Record<string, any>;
}

/**
 * Minimal index template shape exposed by Index Management for cross-plugin consumption.
 *
 * Note: This intentionally avoids importing from `@kbn/index-management-plugin/common` to prevent
 * cyclic dependencies (the plugin depends on these shared types).
 */
export interface IndexManagementIndexTemplate {
  name: string;
  indexPatterns: string[];
  dataStream?: Record<string, any>;
  ilmPolicy?: { name: string };
  lifecycle?: {
    enabled: boolean;
    infiniteDataRetention?: boolean;
    value?: number;
    unit?: string;
  };
  allowAutoCreate: string;
  indexMode?: 'standard' | 'logsdb' | 'time_series' | 'lookup';
  version?: number;
  composedOf?: string[];
  _kbnMeta: {
    type: 'default' | 'managed' | 'cloudManaged' | 'system';
    hasDatastream: boolean;
    isLegacy?: boolean;
  };
}

export interface GetIndexTemplatesResponse {
  templates: IndexManagementIndexTemplate[];
  legacyTemplates: IndexManagementIndexTemplate[];
}

export interface PublicApiServiceSetup {
  getAllEnrichPolicies(): Promise<SendRequestResponse<SerializedEnrichPolicy[]>>;
  /**
   * Fetches composable and legacy index templates as returned by Index Management's
   * `GET /api/index_management/index_templates` endpoint.
   */
  getIndexTemplates(options?: { signal?: AbortSignal }): Promise<GetIndexTemplatesResponse>;
}
