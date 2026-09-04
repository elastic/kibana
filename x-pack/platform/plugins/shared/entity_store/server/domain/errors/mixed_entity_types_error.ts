/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class MixedEntityTypesError extends Error {
  constructor(types: string[]) {
    super(`All entities must be of the same type. Found types: [${types.join(', ')}]`);
    this.name = 'MixedEntityTypesError';
  }
}
