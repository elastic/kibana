/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';

/** 64 bits of SHA-256, hex-encoded: fixed width, and wide enough not to collide across spaces. */
const SPACE_HASH_LENGTH = 16;

/**
 * A managed workflow document id is `<definition id>-<suffix>` and is the ES `_id`, which is
 * unique per index regardless of the document's `spaceId`. An AI index id is only unique within
 * its space, so the suffix has to carry the space too or the same id in two spaces shares one
 * document: the second install silently keeps the first space's `spaceId`, and either space's
 * delete tears down the other's schedule.
 *
 * The space is hashed rather than appended: both ids allow hyphens, so `<space>-<aiIndexId>`
 * would make `('a-b', 'c')` and `('a', 'b-c')` collide, and space ids have no length cap while
 * the `_id` does.
 */
export const managedWorkflowIdSuffixFor = (aiIndexId: string, spaceId: string): string =>
  `${aiIndexId}-${createHash('sha256').update(spaceId).digest('hex').slice(0, SPACE_HASH_LENGTH)}`;
