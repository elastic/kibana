/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { sortByOrder, isObject, get } from 'lodash';

export function sortNodes(nodes, sort) {
  if (!sort) {
    return nodes;
  }

  return sortByOrder(
    nodes,
    node => {
      const value = node[sort.field];
      if (isObject(value)) {
        return get(value, 'summary.lastVal', value);
      }
      return value;
    },
    sort.direction
  );
}
