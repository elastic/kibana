/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceConnector } from '@kbn/inference-common';
import { getContextWindowSize } from '@kbn/inference-common';

/**
 * Fraction of the context window reserved for system prompt, output generation,
 * actions buffer, and other overhead that isn't conversation history.
 */
const RESERVED_FRACTION = 0.3;

/** Fallback context window when the model's size can't be determined */
export const DEFAULT_CONTEXT_WINDOW = 128_000;

export interface ContextBudget {
  /** Total context window size for the model in tokens */
  totalBudget: number;
  /** Token budget available for conversation history (after reserving for overhead) */
  historyBudget: number;
}

export const getContextWindow = (connector: InferenceConnector): number =>
  getContextWindowSize(connector) ?? DEFAULT_CONTEXT_WINDOW;

/**
 * Computes the token budget for conversation history based on the
 * connector's context window size.
 */
export const computeContextBudget = (connector: InferenceConnector): ContextBudget => {
  const totalBudget = getContextWindow(connector);
  const historyBudget = Math.floor(totalBudget * (1 - RESERVED_FRACTION));
  return { totalBudget, historyBudget };
};
