/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';

export type EntityTableSortDirection = 'asc' | 'desc';

export interface EntityTableUrlState {
  query: string;
  sortField: string;
  sortDirection: EntityTableSortDirection;
  pageIndex: number;
  pageSize: number;
}

export interface EntityTableContext<TItem> {
  items: TItem[];
  error: Error | null;
  urlState: EntityTableUrlState;
}

export interface EntityTableInput {
  defaultUrlState: EntityTableUrlState;
}

export type EntityTableEvent =
  | { type: 'url.init'; urlState: EntityTableUrlState }
  | { type: 'url.sync'; replace?: boolean }
  | { type: 'items.refresh' }
  | { type: 'search.change'; query: string }
  | { type: 'sort.change'; sortField: string; sortDirection: EntityTableSortDirection }
  | { type: 'page.change'; pageIndex: number; pageSize: number };

export interface EntityTableUrlDeps {
  core: CoreStart;
  urlStateStorageContainer: IKbnUrlStateStorage;
  urlStateKey: string;
  defaultUrlState: EntityTableUrlState;
}
