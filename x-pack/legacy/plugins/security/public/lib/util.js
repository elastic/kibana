/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function toggle(collection, item) {
  const i = collection.indexOf(item);
  if (i >= 0) collection.splice(i, 1);
  else collection.push(item);
}

export function toggleSort(sort, orderBy) {
  if (sort.orderBy === orderBy) sort.reverse = !sort.reverse;
  else {
    sort.orderBy = orderBy;
    sort.reverse = false;
  }
}
