/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const fiveMinutesInMs = 5 * 60 * 1000;

export function isStale(taskCreatedAt: string) {
  const createdAt = new Date(taskCreatedAt).getTime();
  const now = Date.now();
  return now - createdAt > fiveMinutesInMs;
}
