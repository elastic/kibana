/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ISavedObjectsSerializer, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { Observable } from '../../../common/types/domain';

export interface ObservableServiceContext {
  log: Logger;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  savedObjectsSerializer: ISavedObjectsSerializer;
  /** The namespace of the request's space; every search runs in it. */
  namespace: string;
}

export type ObservableSortField = 'createdAt' | 'value' | 'typeKey';

export interface ObservableKey {
  typeKey: string;
  value: string;
}

export interface ObservableToCreate extends ObservableKey {
  id: string;
  description: string | null;
  /**
   * Stamp the observables of one request one millisecond apart, in request order: previews and
   * pages sort oldest first and break ties by type key and value, not by request order.
   */
  createdAt: string;
}

export interface CaseWithFieldObservables {
  id: string;
  /** The observables stored in the case's `observables` field. */
  observables: Observable[];
}

export interface GetObservablesPreviewsOptions {
  /**
   * Log a failed search and return no previews instead of rejecting, for the response of a write
   * that is already saved: failing it would report the write as failed and skip what runs after.
   */
  ignoreErrors?: boolean;
}

export interface ObservablesPreview {
  /** How many `cases-observables` objects the case holds. */
  count: number;
  /** The case's oldest objects, oldest first. */
  oldest: Observable[];
}

export interface ObservablesPageItem {
  observable: Observable;
  /** The sort values of the item; pass the last item's as `searchAfter` to get the next page. */
  sort: estypes.SortResults;
}

export interface FindObservablesPageArgs {
  caseId: string;
  perPage: number;
  searchAfter?: estypes.SortResults;
  sortField: ObservableSortField;
  sortOrder: estypes.SortOrder;
  typeKeys?: string[];
  /** Matches values that start with it, ignoring case. */
  search?: string;
}
