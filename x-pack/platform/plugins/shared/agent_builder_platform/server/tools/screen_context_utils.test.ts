/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { getTimeRangeFromScreenContext, resolveTimeRange } from './screen_context_utils';

const createMockAttachments = (
  attachments: Array<{ type: string; data?: Record<string, unknown> }>
): AttachmentStateManager => {
  return {
    getActive: () =>
      attachments.map((a, i) => ({
        id: `attachment-${i}`,
        type: a.type,
        current_version: 1,
        versions: [
          {
            version: 1,
            data: a.data,
            created_at: new Date().toISOString(),
            content_hash: 'mock',
            estimated_tokens: 0,
          },
        ],
      })),
  } as unknown as AttachmentStateManager;
};

describe('getTimeRangeFromScreenContext', () => {
  it('returns the time range from a screen context attachment', () => {
    const attachments = createMockAttachments([
      {
        type: AttachmentType.screenContext,
        data: { time_range: { from: 'now-7d', to: 'now' } },
      },
    ]);
    expect(getTimeRangeFromScreenContext(attachments)).toEqual({ from: 'now-7d', to: 'now' });
  });

  it('returns undefined when no screen context attachment exists', () => {
    const attachments = createMockAttachments([{ type: 'some-other-type' }]);
    expect(getTimeRangeFromScreenContext(attachments)).toBeUndefined();
  });

  it('returns undefined when there are no active attachments', () => {
    const attachments = createMockAttachments([]);
    expect(getTimeRangeFromScreenContext(attachments)).toBeUndefined();
  });

  it('returns undefined when screen context has no time_range', () => {
    const attachments = createMockAttachments([
      {
        type: AttachmentType.screenContext,
        data: { url: 'http://localhost:5601/app' },
      },
    ]);
    expect(getTimeRangeFromScreenContext(attachments)).toBeUndefined();
  });
});

describe('resolveTimeRange', () => {
  const emptyAttachments = createMockAttachments([]);
  const attachmentsWithTimeRange = createMockAttachments([
    {
      type: AttachmentType.screenContext,
      data: { time_range: { from: 'now-1w', to: 'now' } },
    },
  ]);

  it('returns explicit time range when provided', () => {
    const explicit = { from: '2026-01-01T00:00:00Z', to: '2026-01-31T23:59:59Z' };
    expect(resolveTimeRange(attachmentsWithTimeRange, explicit)).toEqual(explicit);
  });

  it('falls back to screen context when no explicit range is given', () => {
    expect(resolveTimeRange(attachmentsWithTimeRange)).toEqual({ from: 'now-1w', to: 'now' });
  });

  it('falls back to last 24 hours when neither explicit nor screen context is available', () => {
    expect(resolveTimeRange(emptyAttachments)).toEqual({ from: 'now-24h', to: 'now' });
  });
});
