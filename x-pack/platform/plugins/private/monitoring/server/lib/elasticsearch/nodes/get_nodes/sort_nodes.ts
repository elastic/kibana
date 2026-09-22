/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { orderBy } from 'lodash';

type Node = Record<string, any>;

/**
 * Returns a sort key that compares numerically when the value is numeric,
 * so that e.g. CPU usage "85", "9", "80" sorts as 85, 80, 9 (desc) instead of
 * string order ("9", "85", "80"). Non-numeric values (name, etc.) are returned as-is.
 */
function getSortKey(value: unknown): unknown {
  if (value === undefined || value === null) {
    return value;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : value;
}

export function sortNodes<T extends Node>(
  nodes: T[],
  sort?: { field: string; direction: 'asc' | 'desc' }
) {
  if (!sort || !sort.field) {
    return nodes;
  }

  return orderBy(nodes, (node) => getSortKey(node[sort.field]), sort.direction);
}
