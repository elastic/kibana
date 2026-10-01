/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { toRenderAttachment } from './to_render_attachment';

const attachment: VersionedAttachment = {
  id: 'attachment-1',
  type: 'security.alerts',
  description: 'A described attachment',
  versions: [
    { version: 1, data: { count: 3 }, created_at: '2026-09-01T10:00:00.000Z', content_hash: 'a' },
    { version: 2, data: { count: 19 }, created_at: '2026-09-01T12:00:00.000Z', content_hash: 'b' },
  ],
  current_version: 2,
};

describe('toRenderAttachment', () => {
  it('carries the current version, so a label reflects the latest edit', () => {
    expect(toRenderAttachment(attachment)).toEqual(
      expect.objectContaining({
        id: 'attachment-1',
        type: 'security.alerts',
        data: { count: 19 },
        versionData: expect.objectContaining({ version: 2, versionCount: 2 }),
      })
    );
  });

  it('stands in the lowest stored version when the current one is gone', () => {
    const pruned = { ...attachment, current_version: 7 };

    expect(toRenderAttachment(pruned)).toEqual(
      expect.objectContaining({
        data: { count: 3 },
        versionData: expect.objectContaining({ version: 1 }),
      })
    );
  });

  it('still returns an attachment when no version survives', () => {
    const versionless = { ...attachment, versions: [], current_version: 1 };

    const rendered = toRenderAttachment(versionless);

    // The identity is what the row falls back on, so it has to survive even with no data.
    expect(rendered).toEqual(
      expect.objectContaining({
        id: 'attachment-1',
        type: 'security.alerts',
        description: 'A described attachment',
        data: undefined,
      })
    );
    expect(rendered).not.toHaveProperty('versionData');
  });
});
