/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MIGRATED_ATTACHMENT_TYPES } from '../../common/constants/attachments';
import { UnifiedAttachmentTypeRegistry } from '../attachment_framework/unified_attachment_registry';
import { registerInternalAttachments } from '.';

describe('registerInternalAttachments', () => {
  it('registers every internal attachment type id in MIGRATED_ATTACHMENT_TYPES', () => {
    const registry = new UnifiedAttachmentTypeRegistry();
    registerInternalAttachments(registry);

    const unmapped = registry.list().filter(({ id }) => !MIGRATED_ATTACHMENT_TYPES.has(id));

    expect(unmapped.map(({ id }) => id)).toEqual([]);
  });
});
