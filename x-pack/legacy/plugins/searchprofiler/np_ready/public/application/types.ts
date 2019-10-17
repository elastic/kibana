/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface BreakdownItem {
  tip: string;
  key: string;
  time: number;
  color: string;
  relative: number;
}

export interface Shard {
  id: string[];
  relative: {
    [target: string]: number;
  };
  [search: string]: {};
}

export interface Index {
  name: string;
  time: {
    [target: string]: number;
  };
  shards: Shard[];
}
