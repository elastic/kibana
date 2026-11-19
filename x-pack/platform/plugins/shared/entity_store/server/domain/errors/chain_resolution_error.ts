/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class ChainResolutionError extends Error {
  constructor(entityId: string, resolvedTo: string) {
    super(
      `Entity '${entityId}' is already resolved to '${resolvedTo}'. Unlink it first before linking to a new target.`
    );
    this.name = 'ChainResolutionError';
  }
}
