/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeofPlaceholder, TypeAssumption } from './types';

/**
 * Error thrown when assumptions about typeof placeholders conflict.
 */
export class AssumptionConflictError extends Error {
  constructor(
    public placeholder: TypeofPlaceholder,
    public conflictingAssumptions: TypeAssumption[]
  ) {
    const types = conflictingAssumptions.map((a) => `'${a.assumedType}'`).join(', ');
    const reasons = conflictingAssumptions.map((a) => `  - ${a.reason}`).join('\n');

    super(
      `Conflicting assumptions for ${placeholder}: ` +
        `assumed to be ${types}.\n` +
        `Reasons:\n${reasons}`
    );
    this.name = 'AssumptionConflictError';
    Object.setPrototypeOf(this, AssumptionConflictError.prototype);
  }
}
