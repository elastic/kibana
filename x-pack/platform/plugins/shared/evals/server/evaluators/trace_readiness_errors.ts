/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type TraceReadinessErrorKind = 'not_ready' | 'unresolvable';

export class TraceReadinessError extends Error {
  constructor(message: string, public readonly kind: TraceReadinessErrorKind) {
    super(message);
    this.name = 'TraceReadinessError';
  }
}
