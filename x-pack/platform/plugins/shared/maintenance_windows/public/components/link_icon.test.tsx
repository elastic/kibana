/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { LinkIcon } from './link_icon';
import type { AppMockRenderer } from '../lib/test_utils';
import { createAppMockRenderer } from '../lib/test_utils';

describe('LinkIcon', () => {
  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
  });

  test('it renders', () => {
    const result = appMockRenderer.render(
      <LinkIcon iconSide="right" iconSize="xxl" iconType="warning">
        {'Test link'}
      </LinkIcon>
    );

    expect(result.getByText('Test link')).toBeInTheDocument();
  });

  test('it renders an action button when onClick is provided', () => {
    const result = appMockRenderer.render(
      <LinkIcon iconType="warning" onClick={() => alert('Test alert')}>
        {'Test link'}
      </LinkIcon>
    );

    expect(result.getByRole('button')).toBeInTheDocument();
  });

  test('it renders an icon', () => {
    const result = appMockRenderer.render(<LinkIcon iconType="warning">{'Test link'}</LinkIcon>);

    expect(result.getByTestId('link-icon')).toBeInTheDocument();
  });

  test('it positions the icon to the right when iconSide is right', () => {
    const result = appMockRenderer.render(
      <LinkIcon iconSide="right" iconType="warning">
        {'Test link'}
      </LinkIcon>
    );

    expect(result.getByRole('button')).toHaveStyle({ 'flex-direction': 'row-reverse' });
  });

  test('it positions the icon to the left when iconSide is left (or not provided)', () => {
    const result = appMockRenderer.render(
      <LinkIcon iconSide="left" iconType="warning">
        {'Test link'}
      </LinkIcon>
    );

    expect(result.getByRole('button')).toHaveStyle({ 'flex-direction': 'row' });
  });

  test('it renders a label', () => {
    const result = appMockRenderer.render(<LinkIcon iconType="warning">{'Test link'}</LinkIcon>);

    expect(result.getByTestId('link-icon-label')).toBeInTheDocument();
  });
});
