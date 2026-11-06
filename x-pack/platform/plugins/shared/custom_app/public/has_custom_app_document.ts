/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppDocument } from '@kbn/custom-app-common';

/** What a custom app panel offers to anything that wants to look at what it is made of. */
export interface HasCustomAppDocument {
  /** The saved document, not a preview that is being shown while the editor is open. */
  getDocument: () => AppDocument;
}

export const apiHasCustomAppDocument = (api: unknown): api is HasCustomAppDocument =>
  typeof api === 'object' &&
  api !== null &&
  typeof (api as Partial<HasCustomAppDocument>).getDocument === 'function';
