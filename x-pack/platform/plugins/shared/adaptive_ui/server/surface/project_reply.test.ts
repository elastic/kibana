/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { view, text } from '@kbn/adaptive-ui/builders';
import { ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE } from '../../common/constants';
import { projectReplyToMarkdown } from './project_reply';

const viewAttachment = (id: string, body: string, version = 1): VersionedAttachment =>
  ({
    id,
    type: ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE,
    current_version: version,
    versions: [
      {
        version,
        data: view({ body: [text({ format: 'markdown', body })] }),
        created_at: '2026-01-01T00:00:00.000Z',
        content_hash: `hash-${id}-${version}`,
      },
    ],
  } as unknown as VersionedAttachment);

const tag = (id: string, version?: number) =>
  version === undefined
    ? `<render_attachment id="${id}" />`
    : `<render_attachment id="${id}" version="${version}" />`;

describe('projectReplyToMarkdown', () => {
  it('leaves a reply without tags untouched', () => {
    const result = projectReplyToMarkdown({
      message: 'No attachments here.',
      attachments: [],
    });

    expect(result).toBe('No attachments here.');
  });

  it('replaces a resolvable tag with the rendered view', () => {
    const result = projectReplyToMarkdown({
      message: `Here it is.\n\n${tag('a1')}`,
      attachments: [viewAttachment('a1', 'Investigation summary')],
    });

    expect(result).not.toContain('render_attachment');
    expect(result).toContain('Here it is.');
    expect(result).toContain('Investigation summary');
  });

  it('preserves document order across multiple tags with prose between', () => {
    const result = projectReplyToMarkdown({
      message: `Intro.\n\n${tag('a1')}\n\nMiddle.\n\n${tag('a2')}\n\nOutro.`,
      attachments: [viewAttachment('a1', 'FIRST-VIEW'), viewAttachment('a2', 'SECOND-VIEW')],
    });

    const order = ['Intro.', 'FIRST-VIEW', 'Middle.', 'SECOND-VIEW', 'Outro.'].map((part) =>
      result.indexOf(part)
    );

    expect(order.every((index) => index >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('falls back without dropping prose when the id is unknown', () => {
    const result = projectReplyToMarkdown({
      message: `Before.\n\n${tag('missing')}\n\nAfter.`,
      attachments: [viewAttachment('a1', 'unused')],
    });

    expect(result).not.toContain('render_attachment');
    expect(result).toContain('Before.');
    expect(result).toContain('After.');
    expect(result).toContain('missing');
  });

  it('falls back when the attachment type has no adapter', () => {
    const unknownType = {
      id: 'u1',
      type: 'some.unmapped.type',
      current_version: 1,
      versions: [
        {
          version: 1,
          data: { anything: true },
          created_at: '2026-01-01T00:00:00.000Z',
          content_hash: 'h',
        },
      ],
    } as unknown as VersionedAttachment;

    const result = projectReplyToMarkdown({
      message: tag('u1'),
      attachments: [unknownType],
    });

    expect(result).not.toContain('render_attachment');
    expect(result).toContain('u1');
  });

  it('prefers an explicit tag version over the round ref', () => {
    const attachment = {
      id: 'a1',
      type: ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE,
      current_version: 2,
      versions: [
        {
          version: 1,
          data: view({ body: [text({ format: 'markdown', body: 'VERSION-ONE' })] }),
          created_at: '2026-01-01T00:00:00.000Z',
          content_hash: 'h1',
        },
        {
          version: 2,
          data: view({ body: [text({ format: 'markdown', body: 'VERSION-TWO' })] }),
          created_at: '2026-01-02T00:00:00.000Z',
          content_hash: 'h2',
        },
      ],
    } as unknown as VersionedAttachment;

    const result = projectReplyToMarkdown({
      message: tag('a1', 1),
      attachments: [attachment],
      attachmentRefs: [{ attachment_id: 'a1', version: 2 }] as never,
    });

    expect(result).toContain('VERSION-ONE');
    expect(result).not.toContain('VERSION-TWO');
  });

  it('uses the round ref version when the tag does not name one', () => {
    const attachment = {
      id: 'a1',
      type: ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE,
      current_version: 2,
      versions: [
        {
          version: 1,
          data: view({ body: [text({ format: 'markdown', body: 'VERSION-ONE' })] }),
          created_at: '2026-01-01T00:00:00.000Z',
          content_hash: 'h1',
        },
        {
          version: 2,
          data: view({ body: [text({ format: 'markdown', body: 'VERSION-TWO' })] }),
          created_at: '2026-01-02T00:00:00.000Z',
          content_hash: 'h2',
        },
      ],
    } as unknown as VersionedAttachment;

    const result = projectReplyToMarkdown({
      message: tag('a1'),
      attachments: [attachment],
      attachmentRefs: [{ attachment_id: 'a1', version: 1 }] as never,
    });

    expect(result).toContain('VERSION-ONE');
  });

  it('handles an empty message', () => {
    expect(projectReplyToMarkdown({ message: '', attachments: [] })).toBe('');
  });
});
