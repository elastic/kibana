/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function getNextRunAt(currentRunAt: Date, interval: number) {
  let nextRunAt = currentRunAt.getTime() + interval * 1000;
  if (nextRunAt < Date.now()) {
    // To prevent returning dates in the past, we'll return now instead
    nextRunAt = Date.now();
  }
  return new Date(nextRunAt);
}
