/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getStaleAttachmentInputs } from '../../application/context/conversation/get_stale_attachment_inputs';
import type { VersionedAttachment } from '@kbn/agent-builder-common';

const createVersionedAttachment = (
  id: string,
  overrides: Partial<{
    type: string;
    current_version: number;
    data: Record<string, unknown>;
    hidden: boolean;
  }> = {}
): VersionedAttachment => ({
  id,
  type: overrides.type ?? 'visualization',
  versions: [
    {
      version: overrides.current_version ?? 1,
      data: overrides.data ?? { value: 'test' },
      created_at: '2024-01-01T00:00:00Z',
      content_hash: 'abc',
    },
  ],
  current_version: overrides.current_version ?? 1,
  hidden: overrides.hidden,
});

describe('getStaleAttachmentInputs', () => {
  it('returns attachment inputs only for stale attachments not in exclude set', () => {
    const versionedAttachments: VersionedAttachment[] = [
      createVersionedAttachment('att-1', { type: 'visualization', data: { foo: 'bar' } }),
      createVersionedAttachment('att-2', { type: 'text', data: { value: 'hello' }, hidden: true }),
      createVersionedAttachment('att-3'),
    ];

    const result = getStaleAttachmentInputs(
      {
        attachments: [
          { attachment_id: 'att-1', is_stale: true },
          { attachment_id: 'att-2', is_stale: true },
          { attachment_id: 'att-3', is_stale: false },
          { attachment_id: 'att-missing', is_stale: true },
        ],
      },
      versionedAttachments,
      new Set(['att-2'])
    );

    expect(result).toEqual([
      {
        id: 'att-1',
        type: 'visualization',
        data: { foo: 'bar' },
        hidden: false,
      },
    ]);
  });

  it('returns empty when exclude set contains all stale attachment ids', () => {
    const versionedAttachments: VersionedAttachment[] = [createVersionedAttachment('att-1')];

    const result = getStaleAttachmentInputs(
      {
        attachments: [{ attachment_id: 'att-1', is_stale: true }],
      },
      versionedAttachments,
      new Set(['att-1'])
    );

    expect(result).toEqual([]);
  });

  it('skips attachments whose latest version data is not a record', () => {
    const versionedAttachments: VersionedAttachment[] = [
      createVersionedAttachment('att-1'),
      {
        ...createVersionedAttachment('att-2'),
        versions: [
          {
            version: 1,
            data: 'string data' as unknown,
            created_at: '2024-01-01T00:00:00Z',
            content_hash: 'x',
          },
        ],
        current_version: 1,
      },
    ];

    const result = getStaleAttachmentInputs(
      {
        attachments: [
          { attachment_id: 'att-1', is_stale: true },
          { attachment_id: 'att-2', is_stale: true },
        ],
      },
      versionedAttachments,
      new Set()
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('att-1');
  });
});
