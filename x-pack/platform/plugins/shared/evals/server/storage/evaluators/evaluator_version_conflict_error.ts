/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class EvaluatorVersionConflictError extends Error {
  constructor(name: string, baseVersion: string, latestVersion: string) {
    super(
      `Evaluator "${name}" changed to version ${latestVersion} after this edit started from version ${baseVersion}. Reload the latest version and apply the edit again.`
    );
    this.name = 'EvaluatorVersionConflictError';
  }
}
