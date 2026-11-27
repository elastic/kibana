/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AppFrame } from './app_frame';

describe('AppFrame', () => {
  it('holds what it is given', () => {
    render(
      <AppFrame>
        <p>content</p>
      </AppFrame>
    );

    expect(screen.getByTestId('customAppFrame')).toContainElement(screen.getByText('content'));
  });

  it('takes all the width of a panel that lays out its content with flexbox, rather than the width of its widest component', () => {
    render(
      <div style={{ display: 'flex' }}>
        <AppFrame>
          <p>content</p>
        </AppFrame>
      </div>
    );

    // In a flex row, a child with no width of its own shrinks to its content.
    expect(screen.getByTestId('customAppFrame')).toHaveStyle({
      flex: '1 1 100%',
      width: '100%',
      minWidth: '0',
    });
  });

  it('fills the panel, scrolls on its own if the content is taller, and keeps the content off the edge', () => {
    render(
      <AppFrame>
        <p>content</p>
      </AppFrame>
    );

    const frame = screen.getByTestId('customAppFrame');
    expect(frame).toHaveStyle({ height: '100%', overflowY: 'auto' });
    expect(window.getComputedStyle(frame).padding).not.toBe('');
    expect(window.getComputedStyle(frame).padding).not.toBe('0px');
  });
});
