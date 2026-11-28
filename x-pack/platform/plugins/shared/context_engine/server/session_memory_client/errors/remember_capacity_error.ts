/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** This Kibana instance is at its limit of background memory writes, or is shutting down. */
export class RememberCapacityError extends Error {
  constructor() {
    super('Too many session memory writes are already in progress. Retry shortly.');
    this.name = 'TooManyRequests';
  }
}
