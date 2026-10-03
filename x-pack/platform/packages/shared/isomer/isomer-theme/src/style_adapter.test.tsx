/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Composition, StyleHandle as SdkStyleHandle } from '@elastic/isomer-sdk';
import { definePrimitive, definePrimitivePack } from '@elastic/isomer-sdk';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { z } from '@kbn/zod';
import { borealisDark } from './borealis_tokens.generated';
import { classNames } from './class_names';
import { isomerDistillery } from './distillery';
import { isomerStyleAdapter } from './style_adapter';

const noteStyles = isomerDistillery.createStyleModule('testNote', ({ css, tokens }) => ({
  root: css`
    color: ${tokens.color.text.paragraph};
  `,
}));

const root = noteStyles.handles.root as unknown as SdkStyleHandle;

const renderStyles = (scheme?: 'light' | 'dark') => {
  const collector = isomerStyleAdapter.createCollector({});
  const { resolveClassName } = isomerStyleAdapter.createRenderContext(collector, {});
  const className = resolveClassName?.(root) ?? '';
  return { className, css: isomerStyleAdapter.renderStyles(collector, scheme ? { scheme } : {}) };
};

describe('isomerStyleAdapter', () => {
  it('emits CSS for the class names a render resolves', () => {
    const { className, css } = renderStyles();

    expect(className).toBe('testNote-root');
    expect(css).toContain(`.${className}{`);
  });

  it('lets the wrapper data-theme choose the color scheme', () => {
    const { css } = renderStyles();

    expect(css).toContain('light-dark(');
    expect(css).toContain(".isomer[data-theme='dark']{color-scheme:dark}");
  });

  it('resolves a requested scheme to literal values', () => {
    const { css } = renderStyles('dark');

    expect(css).not.toContain('light-dark(');
    expect(css).toContain(borealisDark.color.text.paragraph);
  });

  it('owns only handles authored in the Isomer distillery', () => {
    expect(isomerStyleAdapter.ownsHandle?.(root)).toBe(true);
    expect(
      isomerStyleAdapter.ownsHandle?.({
        key: 'chart.root',
        readableName: 'chart-root',
        moduleName: 'chart',
      } as SdkStyleHandle)
    ).toBe(false);
  });

  it('styles a pack rendered through the HTML surface', () => {
    const noteSchema = z.object({ type: z.literal('note'), text: z.string() });
    type NoteNode = z.infer<typeof noteSchema>;
    const composition: Composition<NoteNode> = {
      type: 'view',
      body: [{ type: 'note', text: 'Healthy.' }],
    };
    const note = definePrimitive<NoteNode>({
      type: 'note',
      schema: noteSchema,
      catalog: {
        type: 'note',
        purpose: 'State one short fact.',
        useWhen: ['A sentence answers the question.'],
        avoidWhen: ['The answer needs structure.'],
        example: { type: 'note', text: 'Healthy.' },
      },
      examples: [{ type: 'note', text: 'Healthy.' }],
      renderers: {
        react: (node, { context }) => (
          <p className={classNames(context, noteStyles.handles.root)}>{node.text}</p>
        ),
        text: (node) => node.text,
        markdown: (node) => node.text,
      },
    });
    const runtime = createIsomerRuntime({
      packs: [
        definePrimitivePack({ id: 'test', primitives: [note], styleAdapter: isomerStyleAdapter }),
      ],
    });

    const { html, css } = runtime.surfaces.html.render(composition, { theme: 'dark' });

    expect(html).toMatch(/<section class="isomer[^"]*"[^>]*data-theme="dark"/);
    expect(html).toContain('<p class="testNote-root">Healthy.</p>');
    expect(css).toContain('.testNote-root{');
  });
});
