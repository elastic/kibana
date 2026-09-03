/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationStatus } from '../../../common';

export class InvestigationConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvestigationConflictError';
  }

  static settled(investigationId: string, status: InvestigationStatus): InvestigationConflictError {
    return new InvestigationConflictError(
      `Investigation "${investigationId}" is already ${status} and can no longer be updated`
    );
  }

  static concurrentlyModified(investigationId: string): InvestigationConflictError {
    return new InvestigationConflictError(
      `Investigation "${investigationId}" was modified concurrently; retry the update`
    );
  }
}
