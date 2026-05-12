/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Thrown when the workflow-driven anonymization hook fails and
 * `failureMode` is set to `'block'`. The chatComplete call is rejected and
 * no prompt is sent to the LLM connector.
 */
export class InferenceAnonymizationUnavailableError extends Error {
  public readonly hookError: string | undefined;

  constructor(hookError?: string) {
    super(
      hookError
        ? `Anonymization hook failed (failureMode: block): ${hookError}`
        : 'Anonymization hook failed (failureMode: block)'
    );
    this.name = 'InferenceAnonymizationUnavailableError';
    this.hookError = hookError;
  }
}
