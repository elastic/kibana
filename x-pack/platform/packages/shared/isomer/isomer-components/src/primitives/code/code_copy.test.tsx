/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { componentsPack } from '../../pack';
import type { SectionNode } from '../section';
import type { CodeNode } from '.';
import { CODE_COPY_ENHANCEMENT } from '.';
import { COPIED_MS } from './code_react';

const { surfaces } = createIsomerRuntime({ packs: [componentsPack] });

const query: CodeNode = { type: 'code', language: 'esql', text: 'FROM logs-*\n| LIMIT 10' };

const mount = (node: CodeNode | SectionNode, enhancements = [CODE_COPY_ENHANCEMENT]) =>
  render(surfaces.react.renderNode(node, { enhancements }) as ReactElement);

describe('codeCopy', () => {
  const writeText = jest.fn<Promise<void>, [string]>();

  beforeEach(() => {
    writeText.mockReset().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    jest.useRealTimers();
  });

  it('adds no button without the enhancement', () => {
    mount(query, []);

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('copies the code as written, and reads "Copied" for a moment', async () => {
    jest.useFakeTimers();
    mount(query);

    const button = screen.getByRole('button', { name: 'Copy esql code' });
    await act(async () => {
      fireEvent.click(button);
    });

    expect(writeText).toHaveBeenCalledWith('FROM logs-*\n| LIMIT 10');
    expect(button.textContent).toBe('Copied');

    act(() => {
      jest.advanceTimersByTime(COPIED_MS);
    });
    expect(button.textContent).toBe('Copy');
  });

  it('stays "Copy" when the clipboard refuses', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    mount(query);

    const button = screen.getByRole('button', { name: 'Copy esql code' });
    await act(async () => {
      fireEvent.click(button);
    });

    expect(button.textContent).toBe('Copy');
  });

  it('adds no button without the clipboard API', () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    mount(query);

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('names a block with no language "Copy code"', () => {
    mount({ type: 'code', text: 'ok' });

    expect(screen.getByRole('button', { name: 'Copy code' })).toBeTruthy();
  });

  it('applies to code nested in a section', () => {
    mount({ type: 'section', title: 'Query', body: [query] });

    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('draws no button in static markup, and declares no script', () => {
    const markup = renderToStaticMarkup(
      surfaces.react.renderNode(query, { enhancements: [CODE_COPY_ENHANCEMENT] }) as ReactElement
    );
    const { js } = surfaces.html.render(
      { type: 'view', body: [query] },
      { enhancements: [CODE_COPY_ENHANCEMENT], scripts: 'host' }
    );

    expect(markup).not.toContain('<button');
    expect(markup).toContain('FROM logs-*');
    expect(js).toBe('');
  });
});
