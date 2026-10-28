/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StyleHandle } from '@elastic/isomer-sdk';
import { createDomSink } from '@elastic/distillate';
import { isomerDistillery } from './distillery';
import { createIsomerStyleContext } from './style_context';

const noteStyles = isomerDistillery.createStyleModule('testLiveNote', ({ css, tokens }) => ({
  root: css`
    color: ${tokens.color.text.subdued};
    box-shadow: ${tokens.shadow.s};
  `,
}));

describe('createIsomerStyleContext', () => {
  it('writes the root styles and each resolved handle to its sink', async () => {
    const parent = document.createElement('div');
    const { resolveClassName } = createIsomerStyleContext({
      sink: createDomSink({ document, parent }),
    });

    const className = resolveClassName(noteStyles.handles.root as unknown as StyleHandle);
    await Promise.resolve();
    const css = parent.querySelector('style')?.textContent ?? '';

    expect(className).toBe('testLiveNote-root');
    expect(css).toContain(
      '.testLiveNote-root{color:var(--isomer-color-text-subdued);box-shadow:var(--isomer-shadow-s)}'
    );
    expect(css).toMatch(/\.isomer\{[^}]*font-family:var\(--isomer-font-family-sans\)/);
  });

  it('switches shadows on the wrapper data-theme', async () => {
    const parent = document.createElement('div');
    const { resolveClassName } = createIsomerStyleContext({
      sink: createDomSink({ document, parent }),
    });

    resolveClassName(noteStyles.handles.root as unknown as StyleHandle);
    await Promise.resolve();
    const css = parent.querySelector('style')?.textContent ?? '';

    expect(css).toMatch(/\.isomer\[data-theme='dark'\]\{--isomer-shadow-s:/);
  });

  it('renders with the render options given with a sink', async () => {
    const parent = document.createElement('div');
    const { resolveClassName } = createIsomerStyleContext({
      sink: createDomSink({ document, parent }),
      render: { scheme: 'light' },
    });

    resolveClassName(noteStyles.handles.root as unknown as StyleHandle);
    await Promise.resolve();
    const css = parent.querySelector('style')?.textContent ?? '';

    expect(css).toContain('.testLiveNote-root{');
    expect(css).not.toContain("[data-theme='dark']");
    expect(css).not.toContain('light-dark(');
  });

  it('writes one stylesheet to the document head by default, however often it is asked for', async () => {
    const handle = noteStyles.handles.root as unknown as StyleHandle;
    createIsomerStyleContext().resolveClassName(handle);
    createIsomerStyleContext().resolveClassName(handle);
    await Promise.resolve();

    const styles = [...document.head.querySelectorAll('style')].filter(({ textContent }) =>
      textContent?.includes('.testLiveNote-root{')
    );
    expect(styles).toHaveLength(1);
    expect(createIsomerStyleContext()).toBe(createIsomerStyleContext({ root: document }));
  });

  it('writes to a shadow root on its own stylesheet', async () => {
    const root = document.createElement('div').attachShadow({ mode: 'open' });
    createIsomerStyleContext({ root }).resolveClassName(
      noteStyles.handles.root as unknown as StyleHandle
    );
    await Promise.resolve();

    expect(root.querySelector('style')?.textContent).toContain('.testLiveNote-root{');
    expect(createIsomerStyleContext({ root })).not.toBe(createIsomerStyleContext());
  });
});
