/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ActionAggregations {
  pending: number;
  failed: number;
  successful: number;
  responded: number;
  docs: number;
  inferredSuccessful?: number;
}

/**
 * Adjusts action aggregations based on expiration status.
 * When an action expires, agents that haven't responded are considered failed (timed out),
 * not pending.
 */
export const adjustAggregationsForExpiration = <T extends Partial<ActionAggregations>>(
  aggregations: T,
  isExpired: boolean
): T => {
  if (!isExpired) {
    return aggregations;
  }

  const pending = aggregations.pending ?? 0;
  const failed = aggregations.failed ?? 0;

  return {
    ...aggregations,
    failed: failed + pending,
    pending: 0,
  };
};

/**
 * Checks if an action has expired based on its expiration date.
 */
export const isActionExpired = (expirationDate: string | undefined | null): boolean => {
  if (!expirationDate) {
    return false;
  }

  return new Date(expirationDate) < new Date();
};
