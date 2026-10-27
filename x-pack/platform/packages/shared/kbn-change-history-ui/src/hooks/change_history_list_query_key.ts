/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeHistoryScope } from '../types/change_history_scope';
import { DEFAULT_CHANGE_HISTORY_PAGE_SIZE } from '../types/change_history_constants';
import type { ChangeHistorySupports } from '../types';

export const CHANGE_HISTORY_QUERY_KEY = ['change-history'] as const;

export const changeHistoryScopeQueryKeyPrefix = (
  scope: ChangeHistoryScope,
  supports: ChangeHistorySupports
) =>
  [
    ...CHANGE_HISTORY_QUERY_KEY,
    scope.module,
    scope.dataset,
    scope.objectType,
    supports.unsavedChanges,
  ] as const;

export const changeHistoryObjectQueryKeyPrefix = (
  objectId: string,
  scope: ChangeHistoryScope,
  supports: ChangeHistorySupports
) => [...changeHistoryScopeQueryKeyPrefix(scope, supports), objectId] as const;

export const changeHistoryListQueryKey = ({
  objectId,
  scope,
  pageSize = DEFAULT_CHANGE_HISTORY_PAGE_SIZE,
  supports,
}: {
  objectId: string;
  scope: ChangeHistoryScope;
  pageSize?: number;
  supports: ChangeHistorySupports;
}) => [...changeHistoryObjectQueryKeyPrefix(objectId, scope, supports), 'list', pageSize] as const;

export const changeHistoryDetailQueryKey = ({
  objectId,
  changeId,
  scope,
  supports,
}: {
  objectId: string;
  changeId: string;
  scope: ChangeHistoryScope;
  supports: ChangeHistorySupports;
}) =>
  [...changeHistoryObjectQueryKeyPrefix(objectId, scope, supports), 'detail', changeId] as const;
