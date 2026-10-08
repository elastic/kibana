/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentIsomerCompositionMapping } from '@kbn/agent-builder-server/attachments';
import { loggerMock } from '@kbn/logging-mocks';
import type { AttachmentServiceStart } from '../attachments';
import { buildComposition, type BuildCompositionOptions } from './composition';

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

const toText: AttachmentIsomerCompositionMapping = (data, { version }) => ({
  type: 'view',
  title: `Text v${version}`,
  body: [{ type: 'markdown', text: (data as { content: string }).content }],
});

const createAttachmentsService = (
  toIsomerComposition: AttachmentIsomerCompositionMapping | undefined = toText
) =>
  ({
    getTypeDefinition: (type: string) => (type === 'text' ? { toIsomerComposition } : undefined),
  } as unknown as AttachmentServiceStart);

const createOptions = (
  overrides: Partial<BuildCompositionOptions> = {}
): BuildCompositionOptions => ({
  message: 'Here it is: <render_attachment id="a1" />',
  attachments: [createAttachment()],
  attachmentsService: createAttachmentsService(),
  logger: loggerMock.create(),
  ...overrides,
});

const textOnly = [{ type: 'markdown', text: 'Here it is:' }];

describe('buildComposition', () => {
  it('converts markdown into a markdown node', () => {
    expect(buildComposition(createOptions({ message: 'There are **3** open alerts.' }))).toEqual({
      type: 'view',
      body: [{ type: 'markdown', text: 'There are **3** open alerts.' }],
    });
  });

  it('replaces tags with their toIsomerComposition, in place', () => {
    const message = 'Before <render_attachment id="a1" version="1"/> after';

    expect(buildComposition(createOptions({ message })).body).toEqual([
      { type: 'markdown', text: 'Before' },
      { type: 'markdown', text: '**Text v1**' },
      { type: 'markdown', text: 'v1' },
      { type: 'markdown', text: 'after' },
    ]);
  });

  it('uses the round ref version of tags without a version', () => {
    const options = createOptions({ attachmentRefs: [{ attachment_id: 'a1', version: 1 }] });

    expect(buildComposition(options).body).toContainEqual({ type: 'markdown', text: 'v1' });
  });

  it('uses the latest version of tags without a version or a ref', () => {
    expect(buildComposition(createOptions()).body).toContainEqual({ type: 'markdown', text: 'v2' });
  });

  it('ignores versions that are not positive integers', () => {
    for (const version of ['latest', '0']) {
      const message = `<render_attachment id="a1" version="${version}" />`;

      expect(buildComposition(createOptions({ message })).body).toContainEqual({
        type: 'markdown',
        text: 'v2',
      });
    }
  });

  it('does not take the id from a longer attribute name', () => {
    const message = '<render_attachment field-id="x" id="a1" />';

    expect(buildComposition(createOptions({ message })).body).toContainEqual({
      type: 'markdown',
      text: 'v2',
    });
  });

  it('drops tags without an id', () => {
    const message = 'Here it is: <render_attachment version="1" />';

    expect(buildComposition(createOptions({ message })).body).toEqual(textOnly);
  });

  it('leaves out types without a toIsomerComposition', () => {
    const options = createOptions({ attachments: [createAttachment({ type: 'case' })] });

    expect(buildComposition(options).body).toEqual(textOnly);
  });

  it('leaves out missing attachments and versions', () => {
    expect(buildComposition(createOptions({ attachments: [] })).body).toEqual(textOnly);
    expect(
      buildComposition(
        createOptions({ message: 'Here it is: <render_attachment id="a1" version="9" />' })
      ).body
    ).toEqual(textOnly);
  });

  it('leaves out attachments whose toIsomerComposition fails', () => {
    const attachmentsService = createAttachmentsService(() => {
      throw new Error('boom');
    });

    expect(buildComposition(createOptions({ attachmentsService })).body).toEqual(textOnly);
  });

  it('returns an empty composition for an empty message', () => {
    expect(
      buildComposition(createOptions({ message: ' \n<render_attachment />\n ' })).body
    ).toEqual([]);
  });
});
