/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantItem, SignificantItemType, FieldValuePair } from '@kbn/ml-agg-utils';

export interface SignificantItemDuplicateGroup {
  keys: Pick<SignificantItem, keyof SignificantItem>;
  group: SignificantItem[];
}

export type FieldValuePairCounts = Record<string, Record<string, number>>;

export interface ItemSet {
  set: FieldValuePair[];
  size: number;
  maxPValue: number;
  doc_count: number;
  support: number;
  total_doc_count: number;
}

export interface FetchFrequentItemSetsResponse {
  fields: string[];
  itemSets: ItemSet[];
  totalDocCount: number;
}

interface SimpleHierarchicalTreeNodeSet extends FieldValuePair {
  key: string;
  type: SignificantItemType;
  docCount: number;
  pValue: number | null;
}

export interface SimpleHierarchicalTreeNode {
  name: string;
  set: SimpleHierarchicalTreeNodeSet[];
  docCount: number;
  pValue: number | null;
  children: SimpleHierarchicalTreeNode[];
  addNode: (node: SimpleHierarchicalTreeNode) => void;
}

/**
 * Represents a change point in document count statistics,
 * identifying a significant change over time.
 */
export interface DocumentCountStatsChangePoint {
  /** Key is the timestamp of the change point. */
  key: number;
  /** The start timestamp of the change point period. */
  startTs: number;
  /** The end timestamp of the change point period. */
  endTs: number;
  /** The type of change point. */
  type: string;
}
