/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface BreakdownItem {
  tip: string;
  key: string;
  time: number;
  color: string;
  relative: number;
}

export type Targets = 'searches' | 'aggregations';

export interface Shard {
  id: string[];
  relative: number | string;
  time: number;
  color: string;
  aggregations?: Operation[];
  searches?: Operation[];
  rewrite_time?: number;
}

export interface Index {
  name: string;
  time: number;
  shards: Shard[];
  visible: boolean;
}

export interface ShardSerialized {
  id: string;
  searches: Operation[];
  aggregations: Operation[];
}

export interface Operation {
  description?: string;
  hasChildren: boolean;
  visible: boolean;
  selfTime: number;
  timePercentage: string;
  absoluteColor: string;
  time: number;

  parent: Operation | null;
  children: Operation[];

  /**
   * Only exists on top level.
   *
   * @remark
   * For now, when we init profile data for rendering we take a top-level
   * operation and designate it the root of the operations tree - this is not
   * information we get from ES.
   */
  treeRoot?: Operation;

  depth?: number;

  // BWC
  type?: string;

  lucene: string | null;
  query_type: string | null;

  // Searches
  query?: any[];
  rewrite_time?: number;

  // Aggregations
  breakdown?: any;
}
