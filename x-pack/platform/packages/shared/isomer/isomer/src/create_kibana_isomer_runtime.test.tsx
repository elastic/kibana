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
});
