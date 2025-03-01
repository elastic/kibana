/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { PageHeader } from './page_header';
import { AppMockRenderer, createAppMockRenderer } from '../../../lib/test_utils';

describe('PageHeader', () => {
  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it renders', () => {
    appMockRenderer = createAppMockRenderer();
    appMockRenderer.render(<PageHeader title="Test title" description="test description" />);

    expect(screen.getByText('Test title')).toBeInTheDocument();
    expect(screen.getByText('test description')).toBeInTheDocument();
  });

  test('it does not render the description when not provided', () => {
    appMockRenderer = createAppMockRenderer();
    appMockRenderer.render(<PageHeader title="Test title" />);

    expect(screen.queryByTestId('description')).not.toBeInTheDocument();
  });

  test('it renders the back link when provided', () => {
    appMockRenderer = createAppMockRenderer();
    appMockRenderer.render(<PageHeader showBackButton title="Test title" />);

    expect(screen.getByTestId('link-back')).toBeInTheDocument();
  });

  test('it does not render the back link when not provided', () => {
    appMockRenderer = createAppMockRenderer();
    appMockRenderer.render(<PageHeader title="Test title" />);

    expect(screen.queryByTestId('link-back')).not.toBeInTheDocument();
  });
});
