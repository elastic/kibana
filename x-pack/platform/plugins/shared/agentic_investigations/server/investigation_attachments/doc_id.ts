/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';

/**
 * Deterministic document id from its key parts, e.g. `(spaceId, conversationId)`. Joining the
 * parts can exceed Elasticsearch's 512-byte `_id` limit, so the id is a hash of the
 * length-prefixed parts; the prefix keeps `('a:b', 'c')` and `('a', 'b:c')` apart.
 */
export const hashInvestigationAttachmentId = (...parts: string[]): string =>
  createHash('sha256')
    .update(parts.map((part) => `${part.length}:${part}`).join('\0'))
    .digest('hex');
