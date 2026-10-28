/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { definePrimitive, definePrimitivePack } from '@elastic/isomer-sdk';
import { md } from '@elastic/isomer-sdk/markdown';
import type { SlackBlock } from '@elastic/isomer-sdk/slack';
import { classNames, isomerDistillery } from '@kbn/isomer-theme';
import { z } from '@kbn/zod';
import type { Composition } from '..';
import { CompositionValidationError, createKibanaIsomerRuntime } from '..';

const noteSchema = z.object({ type: z.literal('note'), text: z.string().min(1) });

type NoteNode = z.infer<typeof noteSchema>;

const note = definePrimitive({
  type: 'note',
  schema: noteSchema,
  catalog: {
    type: 'note',
    purpose: 'State one short fact.',
    useWhen: ['A sentence answers the question.'],
    avoidWhen: ['The answer needs structure.'],
    example: { type: 'note', text: 'All services are healthy.' },
  },
  examples: [{ type: 'note', text: 'All services are healthy.' }],
  renderers: {
    react: (node) => <p>{node.text}</p>,
    text: (node) => node.text,
    markdown: (node) => md.blockquote(md.paragraph(node.text)),
  },
});

const runtime = createKibanaIsomerRuntime({
  packs: [definePrimitivePack({ id: 'test', primitives: [note] })],
});

const composition: Composition<NoteNode> = {
  type: 'view',
  body: [{ type: 'note', text: 'All services are healthy.' }],
};

const invalid: Composition<NoteNode> = { type: 'view', body: [{ type: 'note', text: '' }] };

const noticeStyles = isomerDistillery.createStyleModule('testKibanaNotice', ({ css, tokens }) => ({
  root: css`
    color: ${tokens.color.text.subdued};
  `,
}));

const noticeSchema = noteSchema.extend({ type: z.literal('notice') });

type NoticeNode = z.infer<typeof noticeSchema>;

const notice = definePrimitive({
  type: 'notice',
  schema: noticeSchema,
  catalog: {
    type: 'notice',
    purpose: 'State one short fact, styled.',
    useWhen: ['A sentence answers the question.'],
    avoidWhen: ['The answer needs structure.'],
    example: { type: 'notice', text: 'All services are healthy.' },
  },
  examples: [{ type: 'notice', text: 'All services are healthy.' }],
  renderers: {
    react: (node, { context }) => (
      <p className={classNames(context, noticeStyles.handles.root)}>{node.text}</p>
    ),
    text: (node) => node.text,
    markdown: (node) => md.paragraph(node.text),
  },
});

const styledRuntime = createKibanaIsomerRuntime({
  packs: [definePrimitivePack({ id: 'styled', primitives: [notice] })],
});

const noticeComposition: Composition<NoticeNode> = {
  type: 'view',
  theme: 'dark',
  body: [{ type: 'notice', text: 'All services are healthy.' }],
};

const stylesheets = () =>
  [...document.head.querySelectorAll('style')].filter(({ textContent }) =>
    textContent?.includes('.testKibanaNotice-root{')
  );

describe('createKibanaIsomerRuntime', () => {
  it('validates a primitive whose schema is built with @kbn/zod', () => {
    expect(runtime.validate(composition).valid).toBe(true);
    expect(runtime.getAuthoringContext().primitives.map(({ type }) => type)).toEqual(['note']);
  });

  it('reports findings with a path and node type', () => {
    const { valid, errors } = runtime.validate(invalid);

    expect(valid).toBe(false);
    expect(errors).toEqual([expect.objectContaining({ path: 'body[0].text', nodeType: 'note' })]);
  });

  it('renders the text, markdown and Slack surfaces', () => {
    const { blocks, text }: { blocks: SlackBlock[]; text: string } =
      runtime.surfaces.slack.render(composition);

    expect(runtime.surfaces.text.render(composition)).toContain('All services are healthy.');
    expect(runtime.surfaces.markdown.render(composition)).toContain('> All services are healthy.');
    expect(text).toContain('All services are healthy.');
    expect(blocks.length).toBeGreaterThan(0);
  });

  it('renders the React surface with the localized default label', () => {
    const markup = renderToStaticMarkup(
      <>{runtime.surfaces.react.render(composition, { wrapper: true })}</>
    );

    expect(markup).toContain('<p>All services are healthy.</p>');
    expect(markup).toContain('aria-label="Content"');
  });

  it('throws the exported CompositionValidationError for an invalid composition', () => {
    expect(() => runtime.surfaces.text.render(invalid)).toThrow(CompositionValidationError);
  });

  describe('styled React renders', () => {
    it('wrap in the themed root and write the CSS to the document, with no setup', async () => {
      const markup = renderToStaticMarkup(
        <>{styledRuntime.surfaces.react.render(noticeComposition)}</>
      );
      await Promise.resolve();

      expect(markup).toMatch(/<section class="isomer[^"]*"[^>]*data-theme="dark"/);
      expect(markup).toContain('<p class="testKibanaNotice-root">');
      expect(stylesheets()).toHaveLength(1);
      expect(stylesheets()[0].textContent).toMatch(/\.isomer\{[^}]*font-family:/);
    });

    it('share one stylesheet across renders', async () => {
      renderToStaticMarkup(<>{styledRuntime.surfaces.react.render(noticeComposition)}</>);
      renderToStaticMarkup(
        <>{styledRuntime.surfaces.react.renderNode(noticeComposition.body[0])}</>
      );
      await Promise.resolve();

      expect(stylesheets()).toHaveLength(1);
    });

    it('leave document styles alone when the caller supplies a resolver', async () => {
      const before = document.head.querySelectorAll('style').length;
      jest.isolateModules(() => {
        const { createKibanaIsomerRuntime: createRuntime } =
          jest.requireActual<typeof import('..')>('..');
        const isolatedRuntime = createRuntime({
          packs: [definePrimitivePack({ id: 'host-styled', primitives: [notice] })],
        });
        isolatedRuntime.surfaces.react.render(noticeComposition, {
          wrapper: false,
          context: { resolveClassName: () => 'host-class' },
        });
      });
      await Promise.resolve();

      expect(document.head.querySelectorAll('style')).toHaveLength(before);
    });

    it("keep the caller's wrapper and context", () => {
      const markup = renderToStaticMarkup(
        <>
          {styledRuntime.surfaces.react.render(noticeComposition, {
            wrapper: false,
            context: { resolveClassName: () => 'host-class' },
          })}
        </>
      );

      expect(markup).toBe('<p class="host-class">All services are healthy.</p>');
    });
  });
});
