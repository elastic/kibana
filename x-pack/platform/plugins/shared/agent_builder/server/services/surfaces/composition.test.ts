/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRound } from '@kbn/agent-builder-common';
import type {
  AttachmentVersionRef,
  VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { loggerMock } from '@kbn/logging-mocks';
import type { AttachmentServiceStart } from '../attachments';
import { buildComposition } from './composition';

type ToSurfaceComposition = NonNullable<AttachmentTypeDefinition['toSurfaceComposition']>;

const createAttachment = (parts: Partial<VersionedAttachment> = {}): VersionedAttachment => ({
  id: 'a1',
  type: 'text',
  current_version: 2,
  versions: [1, 2].map((version) => ({
    version,
    data: {},
    created_at: '2026-10-06T00:00:00.000Z',
    content_hash: `hash-${version}`,
  })),
  ...parts,
});

/** Renders each attachment as its id and version, so tests can see which one was resolved. */
const echoAttachment: ToSurfaceComposition = (data, { attachment, version }) => ({
  type: 'view',
  body: [{ type: 'markdown', text: `[${attachment.id} v${version}]` }],
});

interface ComposeOptions {
  attachments?: VersionedAttachment[];
  attachmentRefs?: AttachmentVersionRef[];
  toSurfaceComposition?: ToSurfaceComposition;
}

const compose = (
  message: string,
  {
    attachments = [createAttachment()],
    attachmentRefs,
    toSurfaceComposition = echoAttachment,
  }: ComposeOptions = {}
) =>
  buildComposition({
    round: {
      input: { message: 'hello', attachment_refs: attachmentRefs },
      response: { message },
    } as ConversationRound,
    attachments,
    attachmentsService: {
      getTypeDefinition: (type: string) => (type === 'text' ? { toSurfaceComposition } : undefined),
    } as unknown as AttachmentServiceStart,
    logger: loggerMock.create(),
  });

/** The texts of the composition's nodes. */
const build = (message: string, options?: ComposeOptions) =>
  compose(message, options).body.map((node) => ('text' in node ? node.text : node));

describe('buildComposition', () => {
  it('converts markdown into a markdown node', () => {
    expect(build('There are **3** alerts.')).toEqual(['There are **3** alerts.']);
  });

  it('replaces tags with what their toSurfaceComposition returns, in place', () => {
    const message = [
      'Here is the note:',
      '<render_attachment id="a1" version="1" />',
      'Inline: <render_attachment id="a1"/> done',
    ].join('\n\n');

    expect(build(message)).toEqual(['Here is the note:', '[a1 v1]', 'Inline:', '[a1 v2]', 'done']);
  });

  it('shows the title and subtitle of the attachment composition as a heading', () => {
    const toSurfaceComposition: ToSurfaceComposition = () => ({
      type: 'view',
      title: 'Note',
      subtitle: 'v1',
      body: [{ type: 'markdown', text: 'Content' }],
    });

    expect(build('<render_attachment id="a1" />', { toSurfaceComposition })).toEqual([
      '**Note**\n_v1_',
      'Content',
    ]);
  });

  it('uses the latest version of tags without a version', () => {
    expect(build('<render_attachment id="a1" />')).toEqual(['[a1 v2]']);
  });

  it('uses the latest version even when the round sent an older one', () => {
    expect(
      build('<render_attachment id="a1" />', {
        attachmentRefs: [{ attachment_id: 'a1', version: 1 }],
      })
    ).toEqual(['[a1 v2]']);
  });

  it('ignores versions that are not positive integers', () => {
    expect(build('<render_attachment id="a1" version="latest" />')).toEqual(['[a1 v2]']);
    expect(build('<render_attachment id="a1" version="0" />')).toEqual(['[a1 v2]']);
  });

  it('does not take the id from a longer attribute name', () => {
    expect(build('<render_attachment field-id="x" id="a1" />')).toEqual(['[a1 v2]']);
  });

  it('drops tags without an id', () => {
    expect(build('Hello <render_attachment version="1" />')).toEqual(['Hello']);
  });

  it('leaves out types without a toSurfaceComposition', () => {
    expect(
      build('Here: <render_attachment id="a1" />', {
        attachments: [createAttachment({ type: 'case' })],
      })
    ).toEqual(['Here:']);
  });

  it('leaves out missing attachments and versions', () => {
    expect(build('Here: <render_attachment id="a1" />', { attachments: [] })).toEqual(['Here:']);
    expect(build('Here: <render_attachment id="a1" version="9" />')).toEqual(['Here:']);
  });

  it('leaves out attachments whose toSurfaceComposition fails', () => {
    const toSurfaceComposition: ToSurfaceComposition = () => {
      throw new Error('boom');
    };

    expect(build('Here: <render_attachment id="a1" />', { toSurfaceComposition })).toEqual([
      'Here:',
    ]);
  });

  it('leaves out attachments whose toSurfaceComposition returns an invalid composition', () => {
    const missingText = (() => ({
      type: 'view',
      body: [{ type: 'markdown' }],
    })) as unknown as ToSurfaceComposition;

    const unknownType = (() => ({
      type: 'view',
      body: [{ type: 'chart', text: 'Chart' }],
    })) as unknown as ToSurfaceComposition;

    for (const toSurfaceComposition of [missingText, unknownType]) {
      expect(build('Here: <render_attachment id="a1" /> Done', { toSurfaceComposition })).toEqual([
        'Here:',
        'Done',
      ]);
    }
  });

  it('returns no nodes for an empty message', () => {
    expect(build(' \n<render_attachment />\n ')).toEqual([]);
  });
});
