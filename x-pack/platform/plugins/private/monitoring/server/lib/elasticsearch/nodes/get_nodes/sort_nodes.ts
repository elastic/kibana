/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { orderBy } from 'lodash';

type Node = Record<string, any>;

export function sortNodes<T extends Node>(
  nodes: T[],
  sort?: { field: string; direction: 'asc' | 'desc' }
) {
  if (!sort || !sort.field) {
    return nodes;
  }

  return orderBy(nodes, (node) => node[sort.field], sort.direction);
}
