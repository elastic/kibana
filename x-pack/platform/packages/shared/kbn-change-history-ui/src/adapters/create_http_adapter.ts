/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeHistoryHttpClient } from '../types/change_history_http_client';
import type { ChangeHistoryAdapter } from '../types/change_history_adapter';
import type { ChangeHistoryDetail } from '../types/change_history_detail';
import type { ChangeHistoryListItem } from '../types/change_history_list_item';
import type { ListChangeHistoryResult } from '../types/list_change_history_params';
import { mapChangeHistoryHttpError } from '../utils/map_change_history_http_error';

export interface ChangeHistoryHttpAdapterConfig {
  http: ChangeHistoryHttpClient;
  /**
   * Path template with `{objectId}` placeholder.
   * Example: `/api/{plugin}/{entity}/{objectId}/history`
   */
  listPath: string;
  /**
   * Optional path template with `{objectId}` and `{eventId}` for getChange.
   * When omitted, getChange is not supported by the HTTP adapter.
   */
  detailPath?: string;
  /**
   * Optional path template with `{objectId}` and `{eventId}` for restoreChange.
   * Requires `http.post`. When omitted, restoreChange is not supported.
   */
  restorePath?: string;
  /**
   * API query param `page` index base. The UI always uses 0-based `page.index`;
   * the adapter sends `page.index + pageIndexBase` to the API. Default: `0`.
   */
  pageIndexBase?: 0 | 1;
  mapListItem?: (dto: unknown) => ChangeHistoryListItem;
  mapDetail?: (dto: unknown) => ChangeHistoryDetail;
  mapListResponse?: (body: unknown) => ListChangeHistoryResult;
  /** Maps HTTP fetch errors for list/get/restore. Default: {@link mapChangeHistoryHttpError}. */
  mapHttpError?: (error: unknown) => Error;
}

const replaceObjectId = (path: string, objectId: string): string =>
  path.replace('{objectId}', encodeURIComponent(objectId));

const replaceEventId = (path: string, eventId: string): string =>
  path.replace('{eventId}', encodeURIComponent(eventId));

const defaultMapListResponse = (body: unknown): ListChangeHistoryResult => {
  const response = body as {
    items?: unknown[];
    total?: number;
  };

  return {
    items: (response.items ?? []) as ChangeHistoryListItem[],
    total: response.total ?? 0,
  };
};

const toApiPageIndex = (pageIndex: number, pageIndexBase: 0 | 1): number =>
  pageIndex + pageIndexBase;

export const createChangeHistoryHttpAdapter = (
  config: ChangeHistoryHttpAdapterConfig
): ChangeHistoryAdapter => {
  const mapListResponse = config.mapListResponse ?? defaultMapListResponse;
  const mapHttpError = config.mapHttpError ?? mapChangeHistoryHttpError;
  const pageIndexBase = config.pageIndexBase ?? 0;

  const adapter: ChangeHistoryAdapter = {
    listChanges: async ({ objectId, page, signal }) => {
      const query: Record<string, string | number> = {
        page: toApiPageIndex(page.index, pageIndexBase),
        per_page: page.size,
      };

      try {
        const body = await config.http.get<unknown>(replaceObjectId(config.listPath, objectId), {
          query,
          signal,
        });

        const mapped = mapListResponse(body);
        const mapListItem = config.mapListItem;

        if (!mapListItem) {
          return mapped;
        }

        return {
          ...mapped,
          items: mapped.items.map((item) => mapListItem(item)),
        };
      } catch (error) {
        throw mapHttpError(error);
      }
    },

    getChange: async ({ objectId, changeId, signal }) => {
      if (!config.detailPath) {
        throw new Error('createChangeHistoryHttpAdapter: detailPath is required for getChange');
      }

      const path = replaceEventId(replaceObjectId(config.detailPath, objectId), changeId);

      try {
        const body = await config.http.get<unknown>(path, { signal });
        return config.mapDetail ? config.mapDetail(body) : (body as ChangeHistoryDetail);
      } catch (error) {
        throw mapHttpError(error);
      }
    },
  };

  if (config.restorePath) {
    adapter.restoreChange = async ({ objectId, changeId, signal }) => {
      if (!config.http.post) {
        throw new Error('createChangeHistoryHttpAdapter: http.post is required for restoreChange');
      }

      const path = replaceEventId(replaceObjectId(config.restorePath!, objectId), changeId);

      try {
        await config.http.post(path, { signal });
      } catch (error) {
        throw mapHttpError(error);
      }
    };
  }

  return adapter;
};
