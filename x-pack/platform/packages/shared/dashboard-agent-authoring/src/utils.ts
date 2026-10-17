/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type DashboardFailureType } from './failure_types';

/**
 * Failure record for tracking dashboard update errors.
 */
export interface DashboardFailure {
  type: DashboardFailureType;
  identifier: string;
  error: string;
}

/**
 * Type-safe extraction of error message from unknown error.
 */
export const getErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : String(error);
};
