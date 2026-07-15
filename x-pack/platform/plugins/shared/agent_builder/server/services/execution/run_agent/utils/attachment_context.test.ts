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
import { createAttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { buildAttachmentContext } from './attachment_context';

const typeDefStub = {
  getTypeDefinition: (type: string) => ({
    id: type,
    validate: (input: unknown) => ({ valid: true as const, data: input }),
    format: () => ({ getRepresentation: () => ({ type: 'text' as const, value: '' }) }),
  }),
};

const makeAttachment = (
  id: string,
  overrides: Partial<VersionedAttachment> = {}
): VersionedAttachment => ({
  id,
  type: 'text',
  active: true,
  current_version: 1,
  versions: [
    {
      version: 1,
      data: { content: 'v1' },
      created_at: '2024-01-01T00:00:00.000Z',
      content_hash: 'hash-v1',
      estimated_tokens: 5,
    },
  ],
  ...overrides,
});

const ref = (
  attachment_id: string,
  operation: AttachmentVersionRef['operation'],
  version = 1
): AttachmentVersionRef => ({ attachment_id, version, operation, actor: 'user' });

describe('buildAttachmentContext', () => {
  it('returns undefined for no refs', () => {
    const manager = createAttachmentStateManager([], typeDefStub);
    expect(buildAttachmentContext([], manager)).toBeUndefined();
  });

  it('returns undefined when refs only contain "read" operations', () => {
    const manager = createAttachmentStateManager([makeAttachment('a-1')], typeDefStub);
    expect(buildAttachmentContext([ref('a-1', 'read')], manager)).toBeUndefined();
  });

  it('renders a "created" section with metadata for attachments created this round', () => {
    const manager = createAttachmentStateManager([makeAttachment('a-1')], typeDefStub);
    const result = buildAttachmentContext([ref('a-1', 'created')], manager);

    expect(result).toContain('added this turn');
    expect(result).toContain('attachment_id="a-1"');
    expect(result).not.toContain('updated this turn');
  });

  it('renders an "updated" section with metadata for attachments updated this round', () => {
    const manager = createAttachmentStateManager([makeAttachment('a-1')], typeDefStub);
    const result = buildAttachmentContext([ref('a-1', 'updated', 2)], manager);

    expect(result).toContain('updated this turn');
    expect(result).toContain('attachment_id="a-1"');
    expect(result).not.toContain('added this turn');
  });

  it('renders both sections when different attachments were created and updated', () => {
    const manager = createAttachmentStateManager(
      [makeAttachment('a-1'), makeAttachment('a-2')],
      typeDefStub
    );
    const result = buildAttachmentContext(
      [ref('a-1', 'created'), ref('a-2', 'updated', 2)],
      manager
    );

    expect(result).toContain('added this turn');
    expect(result).toContain('attachment_id="a-1"');
    expect(result).toContain('updated this turn');
    expect(result).toContain('attachment_id="a-2"');
  });

  it('reports an attachment created and updated in the same round as created only', () => {
    const manager = createAttachmentStateManager([makeAttachment('a-1')], typeDefStub);
    const result = buildAttachmentContext(
      [ref('a-1', 'created', 1), ref('a-1', 'updated', 2)],
      manager
    );

    expect(result).toContain('added this turn');
    expect(result).not.toContain('updated this turn');
    // Only one mention of the attachment id, not one per section.
    expect(result?.match(/attachment_id="a-1"/g)).toHaveLength(1);
  });

  it('skips refs whose attachment no longer resolves in the state manager', () => {
    const manager = createAttachmentStateManager([], typeDefStub);
    const result = buildAttachmentContext([ref('missing', 'created')], manager);
    expect(result).toBeUndefined();
  });
});
