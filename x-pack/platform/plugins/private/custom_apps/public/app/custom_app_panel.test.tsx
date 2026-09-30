/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { CustomAppPanel } from './custom_app_panel';

function renderPanel(props: Partial<React.ComponentProps<typeof CustomAppPanel>> = {}) {
  const setDragHandles = jest.fn();
  render(
    <EuiProvider colorMode="light">
      <CustomAppPanel
        isEditing
        setDragHandles={setDragHandles}
        onEdit={jest.fn()}
        onRemove={jest.fn()}
        {...props}
      >
        <p>panel content</p>
      </CustomAppPanel>
    </EuiProvider>
  );
  const handles = setDragHandles.mock.calls.at(-1)?.[0] as Array<HTMLElement | null> | undefined;
  return { setDragHandles, handles };
}

describe('CustomAppPanel drag handles', () => {
  it('never passes a null handle to the grid', () => {
    // `setDragHandles` in @kbn/grid-layout does `if (handle === null) return`
    // inside its loop, so one null abandons every handle after it — which left
    // title-less panels impossible to drag.
    const { handles } = renderPanel();
    expect(handles).toBeDefined();
    expect(handles).not.toContain(null);
    expect(handles!.length).toBeGreaterThan(0);
  });

  it('registers the pill grip on a panel with no title', () => {
    const { handles } = renderPanel();
    const grip = screen.getByRole('button', { name: 'Move panel' });
    expect(handles).toContain(grip);
  });

  it('registers both the title bar and the grip when the panel has a title', () => {
    const { handles } = renderPanel({ title: 'Pods' });
    const grip = screen.getByRole('button', { name: 'Move panel Pods' });
    expect(handles).toContain(grip);
    expect(handles!.length).toBe(2);
  });

  it('renders no header at all when the panel has no title, in either mode', () => {
    renderPanel();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('keeps the edit controls out of the document until editing', () => {
    renderPanel({ isEditing: false, title: 'Pods' });
    expect(screen.queryByRole('button', { name: /Move panel/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remove panel/ })).not.toBeInTheDocument();
    // The title still renders, since it is content rather than chrome.
    expect(screen.getByRole('heading', { name: 'Pods' })).toBeInTheDocument();
  });
});
