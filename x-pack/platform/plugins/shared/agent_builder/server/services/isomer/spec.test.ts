/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentIsomerSpecMapping } from '@kbn/agent-builder-server/attachments';
import { loggerMock } from '@kbn/logging-mocks';
import type { AttachmentServiceStart } from '../attachments';
import { buildSpec, type BuildSpecOptions } from './spec';

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

const toText: AttachmentIsomerSpecMapping = (data, { version }) => ({
  type: 'view',
  title: `Text v${version}`,
  body: [{ type: 'markdown', text: (data as { content: string }).content }],
});

const createAttachmentsService = (toSpec: AttachmentIsomerSpecMapping | undefined = toText) =>
  ({
    getTypeDefinition: (type: string) => (type === 'text' ? { toSpec } : undefined),
  } as unknown as AttachmentServiceStart);

const createOptions = (overrides: Partial<BuildSpecOptions> = {}): BuildSpecOptions => ({
  message: 'Here it is: <render_attachment id="a1" />',
  attachments: [createAttachment()],
  attachmentsService: createAttachmentsService(),
  logger: loggerMock.create(),
  ...overrides,
});

const textOnly = [{ type: 'markdown', text: 'Here it is:' }];

describe('buildSpec', () => {
  it('converts markdown into a markdown node', () => {
    expect(buildSpec(createOptions({ message: 'There are **3** open alerts.' }))).toEqual({
      type: 'view',
      body: [{ type: 'markdown', text: 'There are **3** open alerts.' }],
    });
  });

  it('replaces tags with their toSpec, in place', () => {
    const message = 'Before <render_attachment id="a1" version="1"/> after';

    expect(buildSpec(createOptions({ message })).body).toEqual([
      { type: 'markdown', text: 'Before' },
      { type: 'markdown', text: '**Text v1**' },
      { type: 'markdown', text: 'v1' },
      { type: 'markdown', text: 'after' },
    ]);
  });

  it('uses the round ref version of tags without a version', () => {
    const options = createOptions({ attachmentRefs: [{ attachment_id: 'a1', version: 1 }] });

    expect(buildSpec(options).body).toContainEqual({ type: 'markdown', text: 'v1' });
  });

  it('uses the latest version of tags without a version or a ref', () => {
    expect(buildSpec(createOptions()).body).toContainEqual({ type: 'markdown', text: 'v2' });
  });

  it('ignores versions that are not positive integers', () => {
    for (const version of ['latest', '0']) {
      const message = `<render_attachment id="a1" version="${version}" />`;

      expect(buildSpec(createOptions({ message })).body).toContainEqual({
        type: 'markdown',
        text: 'v2',
      });
    }
  });

  it('does not take the id from a longer attribute name', () => {
    const message = '<render_attachment field-id="x" id="a1" />';

    expect(buildSpec(createOptions({ message })).body).toContainEqual({
      type: 'markdown',
      text: 'v2',
    });
  });

  it('drops tags without an id', () => {
    const message = 'Here it is: <render_attachment version="1" />';

    expect(buildSpec(createOptions({ message })).body).toEqual(textOnly);
  });

  it('leaves out types without a toSpec', () => {
    const options = createOptions({ attachments: [createAttachment({ type: 'case' })] });

    expect(buildSpec(options).body).toEqual(textOnly);
  });

  it('leaves out missing attachments and versions', () => {
    expect(buildSpec(createOptions({ attachments: [] })).body).toEqual(textOnly);
    expect(
      buildSpec(createOptions({ message: 'Here it is: <render_attachment id="a1" version="9" />' }))
        .body
    ).toEqual(textOnly);
  });

  it('leaves out attachments whose toSpec fails', () => {
    const attachmentsService = createAttachmentsService(() => {
      throw new Error('boom');
    });

    expect(buildSpec(createOptions({ attachmentsService })).body).toEqual(textOnly);
  });

  it('returns an empty spec for an empty message', () => {
    expect(buildSpec(createOptions({ message: ' \n<render_attachment />\n ' })).body).toEqual([]);
  });
});
