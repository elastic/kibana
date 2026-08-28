/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationStatus } from '../../../common';

export class InvestigationConflictError extends Error {
  constructor(investigationId: string, status: InvestigationStatus) {
    super(`Investigation "${investigationId}" is already ${status} and can no longer be updated`);
    this.name = 'InvestigationConflictError';
  }
}
