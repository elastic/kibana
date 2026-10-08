/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { loggerMock } from '@kbn/logging-mocks';
import type { AttachmentServiceStart } from '../attachments';
import {
  resolveAttachmentNode,
  toCompositionNodes,
  type ResolveAttachmentNodeOptions,
} from './composition';
import type { AttachmentNode } from './pack';

describe('toCompositionNodes', () => {
  it('converts markdown into a markdown node', () => {
    expect(toCompositionNodes('There are **3** open alerts.')).toEqual([
      { type: 'markdown', text: 'There are **3** open alerts.' },
    ]);
  });

  it('converts tags into attachment nodes at their position', () => {
    const message = [
      'Here is the query:',
      '<render_attachment id="a1" version="2" />',
      'And the chart:',
      '<render_attachment id="a2"/>',
    ].join('\n\n');

    expect(toCompositionNodes(message)).toEqual([
      { type: 'markdown', text: 'Here is the query:' },
      { type: 'attachment', attachmentId: 'a1', version: 2 },
      { type: 'markdown', text: 'And the chart:' },
      { type: 'attachment', attachmentId: 'a2' },
    ]);
  });

  it('splits tags inline with prose', () => {
    expect(toCompositionNodes('Rule: <render_attachment id="a1" version="1"/> done')).toEqual([
      { type: 'markdown', text: 'Rule:' },
      { type: 'attachment', attachmentId: 'a1', version: 1 },
      { type: 'markdown', text: 'done' },
    ]);
  });

  it('omits versions that are not positive integers', () => {
    for (const version of ['latest', '0']) {
      expect(toCompositionNodes(`<render_attachment id="a1" version="${version}" />`)).toEqual([
        { type: 'attachment', attachmentId: 'a1' },
      ]);
    }
  });

  it('does not take the id from a longer attribute name', () => {
    expect(toCompositionNodes('<render_attachment field-id="x" id="a1" />')).toEqual([
      { type: 'attachment', attachmentId: 'a1' },
    ]);
  });

  it('drops tags without an id', () => {
    expect(toCompositionNodes('Hello <render_attachment version="1" />')).toEqual([
      { type: 'markdown', text: 'Hello' },
    ]);
  });

  it('returns no nodes for an empty message', () => {
    expect(toCompositionNodes(' \n<render_attachment />\n ')).toEqual([]);
  });
});

type ToIsomerComposition = NonNullable<AttachmentTypeDefinition['toIsomerComposition']>;

describe('resolveAttachmentNode', () => {
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

  const toText: ToIsomerComposition = (data, { version }) => ({
    type: 'view',
    title: `Text v${version}`,
    body: [{ type: 'markdown', text: (data as { content: string }).content }],
  });

  const createAttachmentsService = (
    toIsomerComposition: ToIsomerComposition | undefined = toText
  ) =>
    ({
      getTypeDefinition: (type: string) => (type === 'text' ? { toIsomerComposition } : undefined),
    } as unknown as AttachmentServiceStart);

  const createOptions = (
    overrides: Partial<ResolveAttachmentNodeOptions> = {}
  ): ResolveAttachmentNodeOptions => ({
    attachments: [createAttachment()],
    attachmentsService: createAttachmentsService(),
    logger: loggerMock.create(),
    ...overrides,
  });

  const createNode = (version?: number): AttachmentNode => ({
    type: 'attachment',
    attachmentId: 'a1',
    ...(version ? { version } : {}),
  });

  it('replaces the node with what its toIsomerComposition returns', () => {
    expect(resolveAttachmentNode(createNode(1), createOptions())).toEqual([
      { type: 'markdown', text: '**Text v1**' },
      { type: 'markdown', text: 'v1' },
    ]);
  });

  it('uses the round ref version of nodes without a version', () => {
    const options = createOptions({ attachmentRefs: [{ attachment_id: 'a1', version: 1 }] });

    expect(resolveAttachmentNode(createNode(), options)).toContainEqual({
      type: 'markdown',
      text: 'v1',
    });
  });

  it('uses the latest version of nodes without a version or a ref', () => {
    expect(resolveAttachmentNode(createNode(), createOptions())).toContainEqual({
      type: 'markdown',
      text: 'v2',
    });
  });

  it('leaves out types without a toIsomerComposition', () => {
    const options = createOptions({ attachments: [createAttachment({ type: 'case' })] });

    expect(resolveAttachmentNode(createNode(), options)).toEqual([]);
  });

  it('leaves out missing attachments and versions', () => {
    expect(resolveAttachmentNode(createNode(), createOptions({ attachments: [] }))).toEqual([]);
    expect(resolveAttachmentNode(createNode(9), createOptions())).toEqual([]);
  });

  it('leaves out attachments whose toIsomerComposition fails', () => {
    const attachmentsService = createAttachmentsService(() => {
      throw new Error('boom');
    });

    expect(resolveAttachmentNode(createNode(), createOptions({ attachmentsService }))).toEqual([]);
  });
});
