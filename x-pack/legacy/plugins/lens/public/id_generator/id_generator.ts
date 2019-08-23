/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

let idState = 0;

export function generateId(existingIds: string[] = []) {
  do {
    idState++;
  } while (existingIds.includes(String(idState)));
  return String(idState);
}

export function resetIdGenerator() {
  idState = 0;
}
