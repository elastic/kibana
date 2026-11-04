/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaterializeDescription } from './types';
import type { UnsupportedNode } from './nodes';
import { UNSUPPORTED_NODE_TYPE } from './nodes';

/** A placeholder carrying why something wasn't materialized, and what it was when that's known. */
export const createUnsupportedNode = (
  reason: string,
  { title, link }: MaterializeDescription = {}
): UnsupportedNode => ({
  type: UNSUPPORTED_NODE_TYPE,
  reason,
  ...(title ? { title } : {}),
  ...(link ? { link } : {}),
});
