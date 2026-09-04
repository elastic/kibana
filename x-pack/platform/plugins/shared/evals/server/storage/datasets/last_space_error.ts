/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Raised inside a conditional write when a dataset turns out to have no space
 * left to belong to besides the one deleting it, so the caller deletes it
 * rather than storing an assignment nobody could reach it through. Internal to
 * the dataset client; never reaches a route.
 */
export class LastSpaceError extends Error {
  constructor(datasetId: string) {
    super(`Dataset "${datasetId}" is assigned to no other space`);
    this.name = 'LastSpaceError';
  }
}
