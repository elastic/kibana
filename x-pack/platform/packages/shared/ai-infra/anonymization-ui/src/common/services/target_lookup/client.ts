/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { getHttpStatusCode } from '../http_error_utils';

const TARGET_LOOKUP_API_VERSION = '1';

export interface DataViewByIdResponse {
  data_view?: { title?: string };
}

export interface DataViewsListResponse {
  data_view?: Array<{ id: string; title: string; name?: string }>;
}

export interface FieldsForWildcardResponse {
  fields?: Array<{ name: string; metadata_field?: boolean }>;
}

export interface ResolveIndexResponse {
  data_streams?: Array<{ name: string }>;
  aliases?: Array<{ name: string }>;
  indices?: Array<{ name: string }>;
}

export type ExpandWildcardsMode = 'open' | 'all';

interface ResolveIndexOptions {
  expandWildcards?: ExpandWildcardsMode;
}

export interface TargetLookupClient {
  getDataViews: () => Promise<DataViewsListResponse>;
  getDataViewById: (dataViewId: string) => Promise<DataViewByIdResponse>;
  resolveIndex: (query: string, options?: ResolveIndexOptions) => Promise<ResolveIndexResponse>;
  getFieldsForWildcard: (pattern: string) => Promise<FieldsForWildcardResponse>;
}

interface TargetLookupHttpService {
  fetch: HttpSetup['fetch'];
}

const isNotFoundError = (error: unknown): boolean => getHttpStatusCode(error) === 404;

export const createTargetLookupClient = ({
  fetch,
}: TargetLookupHttpService): TargetLookupClient => ({
  getDataViews: () => fetch<DataViewsListResponse>('/api/data_views'),

  getDataViewById: (dataViewId: string) =>
    fetch<DataViewByIdResponse>(`/api/data_views/data_view/${encodeURIComponent(dataViewId)}`),

  resolveIndex: async (query: string, options?: ResolveIndexOptions) => {
    try {
      return await fetch<ResolveIndexResponse>(
        `/internal/index-pattern-management/resolve_index/${encodeURIComponent(query)}`,
        {
          query: { expand_wildcards: options?.expandWildcards ?? 'open' },
        }
      );
    } catch (error) {
      if (isNotFoundError(error)) {
        return {
          data_streams: [],
          aliases: [],
          indices: [],
        };
      }

      throw error;
    }
  },

  getFieldsForWildcard: (pattern: string) =>
    fetch<FieldsForWildcardResponse>('/internal/data_views/_fields_for_wildcard', {
      version: TARGET_LOOKUP_API_VERSION,
      headers: {
        [ELASTIC_HTTP_VERSION_HEADER]: TARGET_LOOKUP_API_VERSION,
      },
      query: {
        pattern,
      },
    }),
});
