/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TEMPORARY latency instrumentation, not meant to be committed. `grep AB_TIMING` the Kibana logs.

const origins = new Map<string, number>();

export const timingLog = (
  scope: string,
  executionId: string | undefined,
  message: string,
  extra?: Record<string, unknown>
): void => {
  const now = Date.now();
  const id = executionId ?? '-';
  if (executionId && !origins.has(executionId)) {
    origins.set(executionId, now);
  }
  const origin = executionId ? origins.get(executionId) : undefined;
  const sinceStart = origin !== undefined ? ` +${now - origin}ms` : '';
  const details = extra ? ` ${JSON.stringify(extra)}` : '';
  console.log(
    `[AB_TIMING] ${new Date(
      now
    ).toISOString()} [${scope}] [${id}] ${message}${sinceStart}${details}`
  );
};

export const createStepTimer = (scope: string, executionId: string | undefined) => {
  const start = Date.now();
  let last = start;
  return (label: string, extra?: Record<string, unknown>) => {
    const now = Date.now();
    timingLog(scope, executionId, `${label} step=${now - last}ms total=${now - start}ms`, extra);
    last = now;
  };
};
