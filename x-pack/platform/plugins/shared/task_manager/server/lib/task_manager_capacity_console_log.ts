/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface CapacityLogParams {
  previousCapacity: number;
  nextCapacity: number;
  decision: 'up' | 'down' | 'same';
  reason: string;
  postClaimUtilizationPct: number;
}

export const logTaskManagerCapacityToConsole = ({
  previousCapacity,
  nextCapacity,
  decision,
  reason,
  postClaimUtilizationPct,
}: CapacityLogParams) => {
  // eslint-disable-next-line no-console
  console.log(
    `[task_manager][dynamic_capacity] decision=${decision}; capacity=${previousCapacity}->${nextCapacity}; reason=${reason}; postClaimUtilizationPct=${postClaimUtilizationPct.toFixed(
      2
    )}`
  );
};
