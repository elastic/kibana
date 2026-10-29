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
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { KibanaIsomerRuntime } from '@kbn/isomer-plugin/server';
import { isomerPluginMock } from '@kbn/isomer-plugin/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { AttachmentServiceStart } from '../attachments';
import { buildComposition } from './composition';

let runtime: KibanaIsomerRuntime;

beforeAll(async () => {
  runtime = await isomerPluginMock.createStartContract().getRuntime();
});

type ToSurfaceComposition = NonNullable<AttachmentTypeDefinition['toSurfaceComposition']>;

const context = { request: httpServerMock.createKibanaRequest(), spaceId: 'space-1' };

/** An attachment with two versions, whose data names the version, so tests can see which one rendered. */
const createAttachment = (parts: Partial<VersionedAttachment> = {}): VersionedAttachment => ({
  id: 'a1',
  type: 'text',
  current_version: 2,
  versions: [1, 2].map((version) => ({
    version,
    data: { version },
    created_at: '2026-10-06T00:00:00.000Z',
    content_hash: `hash-${version}`,
  })),
  ...parts,
});

/** Renders each attachment as its id and the version its data came from. */
const echoAttachment: ToSurfaceComposition = ({ id, data }) => ({
  type: 'view',
  body: [{ type: 'markdown', text: `[${id} v${(data as { version: number }).version}]` }],
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
    context,
    logger: loggerMock.create(),
    runtime,
  });

/** The texts of the composition's nodes. */
const build = async (message: string, options?: ComposeOptions) =>
  (await compose(message, options)).body.map((node) => ('text' in node ? node.text : node));

describe('buildComposition', () => {
  it('converts markdown into a markdown node', async () => {
    expect(await build('There are **3** alerts.')).toEqual(['There are **3** alerts.']);
  });

  it('replaces tags with what their toSurfaceComposition returns, in place', async () => {
    const message = [
      'Here is the note:',
      '<render_attachment id="a1" version="1" />',
      'Inline: <render_attachment id="a1"/> done',
    ].join('\n\n');

    expect(await build(message)).toEqual([
      'Here is the note:',
      '[a1 v1]',
      'Inline:',
      '[a1 v2]',
      'done',
    ]);
  });

  it('shows the title and subtitle of the attachment composition as a heading', async () => {
    const toSurfaceComposition: ToSurfaceComposition = () => ({
      type: 'view',
      title: 'Note',
      subtitle: 'v1',
      body: [{ type: 'markdown', text: 'Content' }],
    });

    expect(await build('<render_attachment id="a1" />', { toSurfaceComposition })).toEqual([
      '**Note**\n_v1_',
      'Content',
    ]);
  });

  it('uses the latest version of tags without a version', async () => {
    expect(await build('<render_attachment id="a1" />')).toEqual(['[a1 v2]']);
  });

  it('uses the latest version even when the round sent an older one', async () => {
    expect(
      await build('<render_attachment id="a1" />', {
        attachmentRefs: [{ attachment_id: 'a1', version: 1 }],
      })
    ).toEqual(['[a1 v2]']);
  });

  it('ignores versions that are not positive integers', async () => {
    expect(await build('<render_attachment id="a1" version="latest" />')).toEqual(['[a1 v2]']);
    expect(await build('<render_attachment id="a1" version="0" />')).toEqual(['[a1 v2]']);
  });

  it('does not take the id from a longer attribute name', async () => {
    expect(await build('<render_attachment field-id="x" id="a1" />')).toEqual(['[a1 v2]']);
  });

  it('keeps an indented code block after a tag as a code block', async () => {
    expect(
      await build('<render_attachment id="a1" />\n\n    const a = 1;\n    const b = 2;')
    ).toEqual(['[a1 v2]', '```\nconst a = 1;\nconst b = 2;\n```']);
  });

  it('keeps an indented code block that starts the message as a code block', async () => {
    expect(await build('    const a = 1;\n\n<render_attachment id="a1" />')).toEqual([
      '```\nconst a = 1;\n```',
      '[a1 v2]',
    ]);
  });

  it('keeps a list whole and places the attachment after it', async () => {
    expect(await build('1. a <render_attachment id="a1" />\n2. b')).toEqual([
      '1. a\n2. b',
      '[a1 v2]',
    ]);
  });

  it('keeps emphasis around a tag intact', async () => {
    expect(await build('**see <render_attachment id="a1" /> here**')).toEqual([
      '**see here**',
      '[a1 v2]',
    ]);
  });

  it('keeps a table whole and places the attachment after it', async () => {
    expect(await build('| a | b |\n| - | - |\n| <render_attachment id="a1" /> | c |')).toEqual([
      '| a | b |\n| - | - |\n| | c |',
      '[a1 v2]',
    ]);
  });

  it('leaves tags in code as text', async () => {
    const fenced = '```\n<render_attachment id="a1" />\n```';
    const inline = 'Use `<render_attachment id="a1" />` to embed.';

    expect(await build(fenced)).toEqual([fenced]);
    expect(await build(inline)).toEqual([inline]);
  });

  it('renders adjacent tags in order', async () => {
    expect(
      await build('<render_attachment id="a1" version="1" /> <render_attachment id="a1" />')
    ).toEqual(['[a1 v1]', '[a1 v2]']);
  });

  it('drops tags without an id', async () => {
    expect(await build('Hello <render_attachment version="1" />')).toEqual(['Hello']);
  });

  it('leaves out types without a toSurfaceComposition', async () => {
    expect(
      await build('Here: <render_attachment id="a1" />', {
        attachments: [createAttachment({ type: 'case' })],
      })
    ).toEqual(['Here:']);
  });

  it('leaves out missing attachments and versions', async () => {
    expect(await build('Here: <render_attachment id="a1" />', { attachments: [] })).toEqual([
      'Here:',
    ]);
    expect(await build('Here: <render_attachment id="a1" version="9" />')).toEqual(['Here:']);
  });

  it('leaves out attachments whose toSurfaceComposition fails', async () => {
    const toSurfaceComposition: ToSurfaceComposition = () => {
      throw new Error('boom');
    };

    expect(await build('Here: <render_attachment id="a1" />', { toSurfaceComposition })).toEqual([
      'Here:',
    ]);
  });

  it('leaves out attachments whose toSurfaceComposition returns an invalid composition', async () => {
    const missingText = (() => ({
      type: 'view',
      body: [{ type: 'markdown' }],
    })) as unknown as ToSurfaceComposition;

    const unknownType = (() => ({
      type: 'view',
      body: [{ type: 'chart', text: 'Chart' }],
    })) as unknown as ToSurfaceComposition;

    for (const toSurfaceComposition of [missingText, unknownType]) {
      expect(
        await build('Here: <render_attachment id="a1" /> Done', { toSurfaceComposition })
      ).toEqual(['Here:', 'Done']);
    }
  });

  it('passes the attachment at the rendered version, and the request and space', async () => {
    const toSurfaceComposition = jest.fn<
      ReturnType<ToSurfaceComposition>,
      Parameters<ToSurfaceComposition>
    >(echoAttachment);

    await build('<render_attachment id="a1" version="1" />', {
      attachments: [createAttachment({ origin: 'origin-1' })],
      toSurfaceComposition,
    });

    expect(toSurfaceComposition).toHaveBeenCalledWith(
      {
        id: 'a1',
        type: 'text',
        data: { version: 1 },
        origin: 'origin-1',
        versionData: { version: 1, versionCount: 2, createdAt: '2026-10-06T00:00:00.000Z' },
      },
      context
    );
  });

  it('keeps the order of asynchronous attachments', async () => {
    const toSurfaceComposition: ToSurfaceComposition = async (attachment, mappingContext) => {
      const { version } = attachment.data as { version: number };

      // The first tag resolves last.
      await new Promise((resolve) => setTimeout(resolve, version === 1 ? 10 : 0));

      return echoAttachment(attachment, mappingContext);
    };

    expect(
      await build('<render_attachment id="a1" version="1" /> <render_attachment id="a1" />', {
        toSurfaceComposition,
      })
    ).toEqual(['[a1 v1]', '[a1 v2]']);
  });

  it('leaves out attachments whose toSurfaceComposition rejects', async () => {
    const toSurfaceComposition: ToSurfaceComposition = async () => {
      throw new Error('boom');
    };

    expect(
      await build('Here: <render_attachment id="a1" /> Done', { toSurfaceComposition })
    ).toEqual(['Here:', 'Done']);
  });

  it('returns no nodes for an empty message', async () => {
    expect(await build(' \n<render_attachment />\n ')).toEqual([]);
  });
});
