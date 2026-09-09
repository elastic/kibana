/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SmlDocument } from './types';

/** Raw origin id (e.g. the saved object id) of an SML document, parsed out of `attributes.origin.uri`. */
export const getSmlOriginId = (doc: Pick<SmlDocument, 'attributes'>): string =>
  doc.attributes.origin.uri.split('://')[1] ?? '';
