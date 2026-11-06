/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Thrown when change tracking is not enabled for the requested module, e.g. because it is
 * not included in `xpack.alerting.ruleChangeTracking.scope`.
 */
export class RuleChangeTrackingDisabledError extends Error {
  constructor(message = 'Rule change tracking is disabled.') {
    super(message);
    this.name = 'RuleChangeTrackingDisabledError';
  }
}
