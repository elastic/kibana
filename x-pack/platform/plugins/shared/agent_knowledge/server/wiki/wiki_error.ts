/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type WikiErrorCode =
  | 'unknown_wiki'
  | 'unknown_page_type'
  | 'invalid_key'
  | 'page_too_large'
  | 'version_conflict'
  | 'invalid_document';

export class WikiError extends Error {
  constructor(public readonly code: WikiErrorCode, message: string) {
    super(message);
    this.name = 'WikiError';
  }
}
