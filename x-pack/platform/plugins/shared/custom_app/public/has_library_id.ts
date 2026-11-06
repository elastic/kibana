/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** What a custom app panel says about the app of the library it links to, if it links to one. */
export interface HasCustomAppLibraryId {
  /** The id of the saved app, or nothing for a panel with an app of its own. */
  getLibraryId: () => string | undefined;
}

/** Whether something is a custom app panel, which is told by it knowing what it links to. */
export const apiHasCustomAppLibraryId = (api: unknown): api is HasCustomAppLibraryId =>
  typeof api === 'object' &&
  api !== null &&
  typeof (api as Partial<HasCustomAppLibraryId>).getLibraryId === 'function';
