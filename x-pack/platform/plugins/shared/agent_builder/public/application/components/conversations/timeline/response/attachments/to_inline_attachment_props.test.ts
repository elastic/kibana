/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import { getScreenContext, toInlineAttachment } from './to_inline_attachment_props';

const attachment = {
  id: 'att-1',
  type: 'dashboard',
  hidden: false,
  origin: 'dashboard-so-1',
  origin_snapshot_at: '2024-01-02T12:00:00Z',
  current_version: 2,
  versions: [
    { version: 1, data: { title: 'v1' }, created_at: '2024-01-01T10:00:00Z', content_hash: 'a' },
    { version: 2, data: { title: 'v2' }, created_at: '2024-01-02T10:00:00Z', content_hash: 'b' },
  ],
} as unknown as VersionedAttachment;

describe('toInlineAttachment', () => {
  it('maps the requested version and its predecessor onto the inline card shape', () => {
    expect(toInlineAttachment(attachment, 2)).toEqual({
      id: 'att-1',
      type: 'dashboard',
      data: { title: 'v2' },
      hidden: false,
      origin: 'dashboard-so-1',
      versionData: {
        version: 2,
        versionCount: 2,
        createdAt: '2024-01-02T10:00:00Z',
        originSyncedAt: '2024-01-02T12:00:00Z',
        previousVersionData: { title: 'v1' },
      },
    });
  });

  it('leaves previousVersionData undefined for the first version', () => {
    expect(toInlineAttachment(attachment, 1)?.versionData?.previousVersionData).toBeUndefined();
  });

  it('returns undefined when the version does not exist', () => {
    expect(toInlineAttachment(attachment, 3)).toBeUndefined();
  });
});

describe('getScreenContext', () => {
  it('returns the latest screen context data when present', () => {
    const screenContext = {
      id: 'sc-1',
      type: AttachmentType.screenContext,
      current_version: 2,
      versions: [
        {
          version: 1,
          data: { url: '/old' },
          created_at: '2024-01-01T10:00:00Z',
          content_hash: 'a',
        },
        {
          version: 2,
          data: { url: '/new' },
          created_at: '2024-01-02T10:00:00Z',
          content_hash: 'b',
        },
      ],
    } as unknown as VersionedAttachment;

    expect(getScreenContext([attachment, screenContext])).toEqual({ url: '/new' });
  });

  it('returns undefined without a screen context attachment', () => {
    expect(getScreenContext([attachment])).toBeUndefined();
    expect(getScreenContext(undefined)).toBeUndefined();
  });
});
