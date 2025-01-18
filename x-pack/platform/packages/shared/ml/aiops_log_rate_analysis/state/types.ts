/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTableActionsColumnType } from '@elastic/eui';

import type { SignificantItem, SignificantItemGroupItem } from '@kbn/ml-agg-utils';

/**
 * Type for defining attributes picked from
 * SignificantItemGroupItem used in the grouped table.
 */
export type GroupTableItemGroup = Pick<
  SignificantItemGroupItem,
  'key' | 'type' | 'fieldName' | 'fieldValue' | 'docCount' | 'pValue' | 'duplicate'
>;

/**
 * Represents a single item in the group table.
 */
export interface GroupTableItem {
  /** Unique identifier for the group table item. */
  id: string;
  /** Document count associated with the item. */
  docCount: number;
  /** Statistical p-value indicating the significance of the item, nullable. */
  pValue: number | null;
  /** Count of unique items within the group. */
  uniqueItemsCount: number;
  /** Array of items within the group, sorted by uniqueness. */
  groupItemsSortedByUniqueness: GroupTableItemGroup[];
  /** Histogram data for the significant item. */
  histogram: SignificantItem['histogram'];
}

/**
 * Type for action columns in a table that involves SignificantItem or GroupTableItem.
 */
export type TableItemAction = EuiTableActionsColumnType<
  SignificantItem | GroupTableItem
>['actions'][number];
