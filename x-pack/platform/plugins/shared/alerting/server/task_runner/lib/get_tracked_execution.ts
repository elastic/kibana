/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getTrackedExecutions = ({
  trackedExecutions,
  currentExecution,
  limit,
}: {
  trackedExecutions: Set<string>;
  currentExecution: string;
  limit: number;
}): string[] => {
  const trackedExecutionsArray = Array.from(trackedExecutions ?? []);
  trackedExecutionsArray.push(currentExecution);
  if (trackedExecutionsArray.length > limit) {
    trackedExecutionsArray.shift();
  }
  return trackedExecutionsArray;
};
