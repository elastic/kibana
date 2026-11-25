/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';

export const createVersionedAttachment = (
  overrides?: Partial<VersionedAttachment>
): VersionedAttachment => ({
  id: 'attachment-1',
  type: 'dashboard',
  current_version: 1,
  versions: [
    {
      version: 1,
      data: { title: 'Host overview' },
      created_at: '2026-09-03T11:17:50.000Z',
      content_hash: 'hash-1',
    },
  ],
  ...overrides,
});
