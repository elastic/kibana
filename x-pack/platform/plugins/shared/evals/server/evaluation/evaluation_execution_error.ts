/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The evaluation could not start because of its input or its trace. Failures of individual
 * evaluators are not thrown; they are returned as `error` results alongside the others.
 */
export class EvaluationExecutionError extends Error {
  constructor(
    message: string,
    public readonly responseType: 'badRequest' | 'forbidden' | 'notFound'
  ) {
    super(message);
    this.name = 'EvaluationExecutionError';
  }
}
