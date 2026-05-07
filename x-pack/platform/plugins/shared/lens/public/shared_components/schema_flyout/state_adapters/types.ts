/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Adapter that converts between API-format form values (dot-path keyed)
 * and internal visualization state (Redux store format).
 */
export interface VizStateAdapter<T = unknown> {
  /** Convert internal viz state to API-format values for form initialization */
  stateToFormValues(state: T): Record<string, unknown>;
  /** Convert API-format form values back to internal viz state, preserving non-styling properties */
  formValuesToState(currentState: T, formValues: Record<string, unknown>): T;
}
