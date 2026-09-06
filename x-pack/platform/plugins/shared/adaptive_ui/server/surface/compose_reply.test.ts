/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { view, text } from '@kbn/adaptive-ui/builders';
import { renderSlack, validateView } from '@kbn/adaptive-ui';
import { sampleInvestigation } from '@kbn/adaptive-ui-adapters';
import { ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE } from '../../common/constants';
import { composeReplyViewSpec } from './compose_reply';

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

const attachmentOfType = (id: string, type: string, data: unknown): VersionedAttachment =>
  ({
    id,
    type,
    current_version: 1,
    versions: [
      { version: 1, data, created_at: '2026-01-01T00:00:00.000Z', content_hash: `hash-${id}` },
    ],
  } as unknown as VersionedAttachment);

const tag = (id: string) => `<render_attachment id="${id}" />`;

/** Markdown bodies of the composed spec's top-level text nodes, in document order. */
const markdownBodies = (spec: ReturnType<typeof composeReplyViewSpec>): string[] =>
  spec.body
    .filter((node): node is { type: 'text'; body: string } => node.type === 'text')
    .map(({ body }) => body);

describe('composeReplyViewSpec', () => {
  it('composes an untagged reply into a single markdown node', () => {
    const spec = composeReplyViewSpec({ message: 'Just prose.', attachments: [] });

    expect(spec.type).toBe('view');
    expect(markdownBodies(spec)).toEqual(['Just prose.']);
  });

  it('produces an empty body for an empty message', () => {
    expect(composeReplyViewSpec({ message: '', attachments: [] }).body).toEqual([]);
  });

  it('inlines an attachment\u2019s primitives rather than nesting a view', () => {
    const spec = composeReplyViewSpec({
      message: tag('a1'),
      attachments: [viewAttachment('a1', 'INLINED')],
    });

    // A nested `view` node would render as a card inside a card on every surface.
    expect(spec.body.some((node) => node.type === 'view')).toBe(false);
    expect(markdownBodies(spec)).toContain('INLINED');
  });

  it('preserves document order across prose and multiple attachments', () => {
    const spec = composeReplyViewSpec({
      message: `Intro.\n\n${tag('a1')}\n\nMiddle.\n\n${tag('a2')}\n\nOutro.`,
      attachments: [viewAttachment('a1', 'FIRST'), viewAttachment('a2', 'SECOND')],
    });

    expect(markdownBodies(spec)).toEqual(['Intro.', 'FIRST', 'Middle.', 'SECOND', 'Outro.']);
  });

  it('keeps a card title and subtitle that inlining would otherwise drop', () => {
    const titled = {
      id: 'a1',
      type: ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE,
      current_version: 1,
      versions: [
        {
          version: 1,
          data: view({
            title: 'Investigation',
            subtitle: 'payment-service',
            body: [text({ format: 'markdown', body: 'DETAIL' })],
          }),
          created_at: '2026-01-01T00:00:00.000Z',
          content_hash: 'h',
        },
      ],
    } as unknown as VersionedAttachment;

    const bodies = markdownBodies(
      composeReplyViewSpec({ message: tag('a1'), attachments: [titled] })
    );

    expect(bodies).toEqual(['**Investigation** — payment-service', 'DETAIL']);
  });

  it('degrades an unresolvable tag without dropping surrounding prose', () => {
    const bodies = markdownBodies(
      composeReplyViewSpec({
        message: `Before.\n\n${tag('missing')}\n\nAfter.`,
        attachments: [],
      })
    );

    expect(bodies).toHaveLength(3);
    expect(bodies[0]).toBe('Before.');
    expect(bodies[1]).toContain('missing');
    expect(bodies[2]).toBe('After.');
  });

  it('composes a native attachment type through its registered adapter', () => {
    const spec = composeReplyViewSpec({
      message: `Here.\n\n${tag('inv-1')}`,
      attachments: [attachmentOfType('inv-1', 'nightshift.investigation', sampleInvestigation)],
    });

    expect(spec.body.length).toBeGreaterThan(1);
    expect(JSON.stringify(spec)).toContain('payment-service');
  });

  it('rewrites root-relative hrefs so they resolve off-site', () => {
    const attachments = [
      attachmentOfType('inv-1', 'nightshift.investigation', sampleInvestigation),
    ];

    const relative = JSON.stringify(composeReplyViewSpec({ message: tag('inv-1'), attachments }));
    const absolute = JSON.stringify(
      composeReplyViewSpec({
        message: tag('inv-1'),
        attachments,
        kibanaUrl: 'https://kibana.example.com',
      })
    );

    expect(relative).toContain('"href":"/app/');
    expect(absolute).not.toContain('"href":"/app/');
    expect(absolute).toContain('"href":"https://kibana.example.com/app/');
  });

  it('composes a spec the host considers valid, so Block Kit is renderable', () => {
    const spec = composeReplyViewSpec({
      message: `Intro.\n\n${tag('inv-1')}\n\nOutro.`,
      attachments: [attachmentOfType('inv-1', 'nightshift.investigation', sampleInvestigation)],
    });

    expect(validateView(spec).valid).toBe(true);
    expect(renderSlack(spec).blocks.length).toBeGreaterThan(0);
  });

  it('renders Block Kit equal to the parts in document order', () => {
    const attachments = [viewAttachment('a1', 'FIRST'), viewAttachment('a2', 'SECOND')];
    const composed = composeReplyViewSpec({
      message: `Intro.\n\n${tag('a1')}\n\n${tag('a2')}`,
      attachments,
    });

    const partwise = renderSlack(
      view({
        body: [
          text({ format: 'markdown', body: 'Intro.' }),
          text({ format: 'markdown', body: 'FIRST' }),
          text({ format: 'markdown', body: 'SECOND' }),
        ],
      })
    );

    expect(renderSlack(composed).blocks).toEqual(partwise.blocks);
  });
});
