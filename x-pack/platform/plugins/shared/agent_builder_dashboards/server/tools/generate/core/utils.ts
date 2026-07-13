/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type DashboardOperationFailureType } from './failure_types';

/**
 * Failure record for tracking panel operation errors.
 */
export interface PanelFailure {
  /** Stable recovery id while the inner dashboard agent is handling this terminal failure. */
  failureId?: string;
  /** Only terminal visualization-generation failures are tracked beyond the current tool call. */
  failureKind?: 'visualization_generation';
  type: DashboardOperationFailureType;
  identifier: string;
  error: string;
}

export type TrackedPanelFailure = PanelFailure & {
  failureId: string;
  failureKind: 'visualization_generation';
};

export const isVisualizationGenerationFailure = (
  failure: PanelFailure
): failure is PanelFailure & { failureKind: 'visualization_generation' } =>
  failure.failureKind === 'visualization_generation';

/**
 * Type-safe extraction of error message from unknown error.
 */
export const getErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : String(error);
};
