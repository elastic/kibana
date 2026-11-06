/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';

const SPACE_HASH_LENGTH = 16;

/** The managed workflow id suffix of an AI index: its id and a hash of its space. */
export const managedWorkflowIdSuffixFor = (aiIndexId: string, spaceId: string): string =>
  `${aiIndexId}-${createHash('sha256').update(spaceId).digest('hex').slice(0, SPACE_HASH_LENGTH)}`;
