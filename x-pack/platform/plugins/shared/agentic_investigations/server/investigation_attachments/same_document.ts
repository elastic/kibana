/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';

/** JSON round trip: drops `undefined` fields the same way indexing a document does. */
const asIndexed = (value: object): object => JSON.parse(JSON.stringify(value));

/**
 * Whether two documents carry the same body once stored. Key order and `undefined` fields do not
 * matter, so a document read back from the index equals the one that was written.
 */
export const sameInvestigationAttachmentDocument = (left: object, right: object): boolean =>
  isEqual(asIndexed(left), asIndexed(right));
