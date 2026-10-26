/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class KiDeletedError extends Error {
  constructor(
    aiIndexId: string,
    kiId: string,
    recoveryHint: string = 'pass force: true to update it'
  ) {
    super(`KI '${kiId}' in AI index '${aiIndexId}' is deleted; ${recoveryHint}`);
    this.name = 'KiDeletedError';
  }
}
