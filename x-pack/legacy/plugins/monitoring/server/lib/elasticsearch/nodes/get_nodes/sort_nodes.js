/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { sortByOrder } from 'lodash';

export function sortNodes(nodes, sort) {
  if (!sort) {
    return nodes;
  }

  return sortByOrder(nodes, node => node[sort.field], sort.direction);
}
