/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface DocumentSelection {
  _id: string;
  _index: string;
}

/** An expanded document as it appears in `event.documents` once preprocessing has run. */
export type ExpandedDocument = DocumentSelection & Record<string, unknown>;
