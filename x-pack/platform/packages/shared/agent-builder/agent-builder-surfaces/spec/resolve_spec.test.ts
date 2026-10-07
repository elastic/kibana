/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { loggerMock } from '@kbn/logging-mocks';
import type { Spec } from './pack';
import { resolveSpec, type AttachmentSpecMapping, type ResolveSpecOptions } from './resolve_spec';

const conversationUrl = 'http://localhost:5601/app/agent_builder/agents/a/conversations/c';

const createAttachment = (parts: Partial<VersionedAttachment> = {}): VersionedAttachment => ({
  id: 'a1',
  type: 'text',
  current_version: 2,
  versions: [1, 2].map((version) => ({
    version,
    data: { content: `v${version}` },
    created_at: '2026-10-06T00:00:00.000Z',
    content_hash: `hash-${version}`,
  })),
  ...parts,
});

const toText: AttachmentSpecMapping = (data, { version }) => ({
  type: 'view',
  title: `Text v${version}`,
  body: [{ type: 'markdown', text: (data as { content: string }).content }],
});

const createOptions = (overrides: Partial<ResolveSpecOptions> = {}): ResolveSpecOptions => ({
  attachments: [createAttachment()],
  getMapping: (type) => (type === 'text' ? toText : undefined),
  conversationUrl,
  logger: loggerMock.create(),
  ...overrides,
});

const createSpec = (version?: number): Spec => ({
  type: 'view',
  body: [
    { type: 'markdown', text: 'Here it is:' },
    { type: 'attachment', attachmentId: 'a1', ...(version ? { version } : {}) },
  ],
});

describe('resolveSpec', () => {
  it('replaces attachment nodes with their mapping', () => {
    expect(resolveSpec(createSpec(1), createOptions()).body).toEqual([
      { type: 'markdown', text: 'Here it is:' },
      { type: 'markdown', text: '**Text v1**' },
      { type: 'markdown', text: 'v1' },
    ]);
  });

  it('uses the round ref version of tags without a version', () => {
    const options = createOptions({
      attachmentRefs: [{ attachment_id: 'a1', version: 1 }],
    });

    expect(resolveSpec(createSpec(), options).body).toContainEqual({
      type: 'markdown',
      text: 'v1',
    });
  });

  it('uses the latest version of tags without a version or a ref', () => {
    expect(resolveSpec(createSpec(), createOptions()).body).toContainEqual({
      type: 'markdown',
      text: 'v2',
    });
  });

  it('links to Kibana for types without a mapping', () => {
    const options = createOptions({
      attachments: [createAttachment({ type: 'case', description: 'Case #12' })],
    });

    expect(resolveSpec(createSpec(), options).body[1]).toEqual({
      type: 'markdown',
      text: `_Case #12_ · [View in Kibana](${conversationUrl})`,
    });
  });

  it('links to Kibana for missing attachments and versions', () => {
    const missingAttachment = resolveSpec(createSpec(), createOptions({ attachments: [] }));
    const missingVersion = resolveSpec(createSpec(9), createOptions());

    expect(missingAttachment.body[1]).toEqual({
      type: 'markdown',
      text: `_Attachment unavailable_ · [View in Kibana](${conversationUrl})`,
    });
    expect(missingVersion.body[1]).toEqual({
      type: 'markdown',
      text: `_text_ · [View in Kibana](${conversationUrl})`,
    });
  });

  it('links to Kibana and logs when a mapping fails', () => {
    const logger = loggerMock.create();
    const options = createOptions({
      logger,
      getMapping: () => () => {
        throw new Error('boom');
      },
    });

    expect(resolveSpec(createSpec(), options).body[1]).toEqual({
      type: 'markdown',
      text: `_text_ · [View in Kibana](${conversationUrl})`,
    });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });
});
