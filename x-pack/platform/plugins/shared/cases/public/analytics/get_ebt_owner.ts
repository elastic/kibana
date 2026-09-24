/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRegisteredOwner } from '../files';

/**
 * Resolves the case context's owner into the value reported on EBT events, falling back to
 * `'unknown'` when the owner is missing or is not a registered solution.
 */
export const getEbtOwner = (owner: string[]): string =>
  owner[0] && isRegisteredOwner(owner[0]) ? owner[0] : 'unknown';
