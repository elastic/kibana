/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { PageHeader } from './page_header';
import type { AppMockRenderer } from '../lib/test_utils';
import { createAppMockRenderer } from '../lib/test_utils';

describe('PageHeader', () => {
  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
  });

  test('it renders', () => {
    const result = appMockRenderer.render(
      <PageHeader title="Test title" description="test description" />
    );

    expect(result.getByText('Test title')).toBeInTheDocument();
    expect(result.getByText('test description')).toBeInTheDocument();
  });

  test('it does not render the description when not provided', () => {
    const result = appMockRenderer.render(<PageHeader title="Test title" />);

    expect(result.queryByTestId('description')).not.toBeInTheDocument();
  });

  test('it renders the back link when provided', () => {
    const result = appMockRenderer.render(<PageHeader showBackButton title="Test title" />);

    expect(result.getByTestId('link-back')).toBeInTheDocument();
  });

  test('it does not render the back link when not provided', () => {
    const result = appMockRenderer.render(<PageHeader title="Test title" />);

    expect(result.queryByTestId('link-back')).not.toBeInTheDocument();
  });
});
