/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Reference-only minimal `ChangeHistoryAdapter` — not compiled or exported by the package.
 *
 * Copy into your plugin and adapt paths, wire types, and mappers. For production features
 * (adapter cache, cross-page diffs, browser-computed list-row changes), see workflows
 * `workflow_change_history_adapter.ts`.
 */

import type { HttpSetup } from '@kbn/core/public';
import type { ChangeHistoryAdapter, ChangeHistoryDetail, ChangeHistoryListItem } from '../..';
import { mapChangeHistoryHttpError } from '../..';

/** Domain wire type from your list route — not a UI DTO. */
interface MyEntityHistoryListRow {
  id: string;
  timestamp: string;
  user: { name: string; id?: string };
  action: string;
  is_current?: boolean;
}

interface MyEntityHistoryListResponse {
  items: MyEntityHistoryListRow[];
  total: number;
}

interface MyEntityHistoryDetailResponse extends MyEntityHistoryListRow {
  snapshot: unknown;
}

const mapListRow = (row: MyEntityHistoryListRow): ChangeHistoryListItem => ({
  id: row.id,
  timestamp: row.timestamp,
  actor: { name: row.user.name, profileId: row.user.id },
  action: row.action,
  isCurrent: row.is_current,
});

const mapDetail = (body: MyEntityHistoryDetailResponse): ChangeHistoryDetail => ({
  ...mapListRow(body),
  snapshot: body.snapshot,
});

export interface CreateMyEntityChangeHistoryAdapterOptions {
  /** Optional host refresh after restore (reload entity, invalidate caches, etc.). */
  onRestored?: (objectId: string) => Promise<void>;
}

export const createMyEntityChangeHistoryAdapter = (
  http: HttpSetup,
  { onRestored }: CreateMyEntityChangeHistoryAdapterOptions = {}
): ChangeHistoryAdapter => ({
  listChanges: async ({ objectId, page, signal }) => {
    try {
      const body = await http.get<MyEntityHistoryListResponse>(
        `/internal/my_plugin/entity/${encodeURIComponent(objectId)}/history`,
        {
          query: { page: page.index + 1, per_page: page.size },
          signal,
        }
      );

      return {
        items: body.items.map(mapListRow),
        total: body.total,
      };
    } catch (error) {
      throw mapChangeHistoryHttpError(error);
    }
  },

  getChange: async ({ objectId, changeId, signal }) => {
    try {
      const body = await http.get<MyEntityHistoryDetailResponse>(
        `/internal/my_plugin/entity/${encodeURIComponent(objectId)}/history/${encodeURIComponent(
          changeId
        )}`,
        { signal }
      );

      return mapDetail(body);
    } catch (error) {
      throw mapChangeHistoryHttpError(error);
    }
  },

  restoreChange: async ({ objectId, changeId, signal }) => {
    try {
      await http.post(
        `/internal/my_plugin/entity/${encodeURIComponent(objectId)}/history/${encodeURIComponent(
          changeId
        )}/restore`,
        { signal }
      );
      await onRestored?.(objectId);
    } catch (error) {
      throw mapChangeHistoryHttpError(error);
    }
  },
});
