/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttachmentVersionRef,
  VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { formatAttachmentsMetadata } from './attachment_presentation';

const makeVersionedAttachment = (
  id: string,
  type: string,
  options: {
    version?: number;
    description?: string;
    estimatedTokens?: number;
    data?: unknown;
  } = {}
): VersionedAttachment => ({
  id,
  type,
  versions: [
    {
      version: options.version ?? 1,
      data: options.data ?? {},
      created_at: new Date().toISOString(),
      content_hash: 'hash123',
      estimated_tokens: options.estimatedTokens ?? 100,
    },
  ],
  current_version: options.version ?? 1,
  active: true,
  description: options.description,
});

const makeRef = (
  attachment: VersionedAttachment,
  options: {
    version?: AttachmentVersionRef['version'];
    operation?: AttachmentVersionRef['operation'];
    actor?: AttachmentVersionRef['actor'];
  } = {}
): AttachmentVersionRef => ({
  attachment_id: attachment.id,
  version: options?.version ? options.version : attachment.versions[0].version,
  ...(options?.operation ? { operation: options.operation } : {}),
  ...(options?.actor ? { actor: options.actor } : {}),
});

const makeStateManager = (records: VersionedAttachment[]): AttachmentStateManager =>
  ({
    getAttachmentRecord: (id: string) => records.find((r) => r.id === id),
  } as AttachmentStateManager);

describe('formatAttachmentsMetadata', () => {
  it('returns empty string for no attachment refs', () => {
    const stateManager = makeStateManager([]);
    expect(formatAttachmentsMetadata([], stateManager)).toBe('');
  });

  it('renders metadata for a single attachment ref', () => {
    const attachment = makeVersionedAttachment('1', 'text', {
      description: 'Test',
      estimatedTokens: 42,
      data: 'Hello world',
    });
    const stateManager = makeStateManager([attachment]);

    const result = formatAttachmentsMetadata(
      [makeRef(attachment, { operation: 'created', actor: 'user' })],
      stateManager
    );

    expect(result).toContain('count="1"');
    expect(result).toContain('attachment_id="1"');
    expect(result).toContain('type="text"');
    expect(result).toContain('version="1"');
    expect(result).toContain('estimated_tokens="42"');
    expect(result).toContain('description="Test"');
    expect(result).toContain('operation="created"');
    expect(result).toContain('actor="user"');
    // Content is never inlined — only metadata.
    expect(result).not.toContain('Hello world');
  });

  it('renders metadata for multiple attachment refs', () => {
    const attachments = Array.from({ length: 6 }, (_, i) =>
      makeVersionedAttachment(`${i}`, 'text')
    );
    const stateManager = makeStateManager(attachments);
    const refs = attachments.map((a) => makeRef(a));

    const result = formatAttachmentsMetadata(refs, stateManager);

    expect(result).toContain('count="6"');
    for (let i = 0; i < 6; i++) {
      expect(result).toContain(`attachment_id="${i}"`);
    }
  });

  it('returns undefined if all refs getAttachmentRecord returns undefined', () => {
    const stateManager = makeStateManager([]);

    const result = formatAttachmentsMetadata(
      [{ attachment_id: 'missing-id', version: 1 }],
      stateManager
    );

    expect(result).toBe('');
  });

  it('falls back to latest version when the requested version does not exist on the record', () => {
    const attachment = makeVersionedAttachment('1', 'text', { version: 1 });
    const stateManager = makeStateManager([attachment]);

    const result = formatAttachmentsMetadata([makeRef(attachment, { version: 99 })], stateManager);

    expect(result).toContain('attachment_id="1"');
  });

  it('includes operation and actor from the ref in XML attributes', () => {
    const attachment = makeVersionedAttachment('1', 'text');
    const stateManager = makeStateManager([attachment]);

    const result = formatAttachmentsMetadata(
      [makeRef(attachment, { operation: 'created', actor: 'agent' })],
      stateManager
    );

    expect(result).toContain('operation="created"');
    expect(result).toContain('actor="agent"');
  });

  it('excludes operation and actor from XML attributes when not present on ref', () => {
    const attachment = makeVersionedAttachment('1', 'text');
    const stateManager = makeStateManager([attachment]);

    const result = formatAttachmentsMetadata([makeRef(attachment)], stateManager);

    expect(result).not.toContain('operation=');
    expect(result).not.toContain('actor=');
  });

  it('includes description in XML attributes', () => {
    const attachment = makeVersionedAttachment('1', 'text', { description: 'My notes' });
    const stateManager = makeStateManager([attachment]);

    const result = formatAttachmentsMetadata([makeRef(attachment)], stateManager);

    expect(result).toContain('description="My notes"');
  });

  it('escapes XML special characters in description', () => {
    const attachment = makeVersionedAttachment('1', 'text', {
      description: 'Test <>&"\'',
    });
    const stateManager = makeStateManager([attachment]);

    const result = formatAttachmentsMetadata([makeRef(attachment)], stateManager);

    expect(result).toContain('&lt;');
    expect(result).toContain('&gt;');
    expect(result).toContain('&amp;');
  });
});
