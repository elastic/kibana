/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Thrown when the catalog has no row matching a requested slug. Surfaced as
 * HTTP 404.
 */
export class LibraryNotFoundError extends Error {
  readonly statusCode = 404;
  constructor(slug: string) {
    super(`Template "${slug}" was not found in the catalog.`);
    this.name = 'LibraryNotFoundError';
  }
}
