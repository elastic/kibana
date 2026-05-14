/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { MarkdownErrorBoundary } from './markdown_error_boundary';

const ThrowingChild = () => {
  throw new Error('ReferenceError: parts is not defined');
};

describe('MarkdownErrorBoundary', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders children when no error occurs', () => {
    render(
      <MarkdownErrorBoundary content="test content">
        <div data-test-subj="child">{'child content'}</div>
      </MarkdownErrorBoundary>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.queryByTestId('markdown-render-error')).not.toBeInTheDocument();
  });

  it('renders an error callout with raw content when a child throws', () => {
    const rawContent = 'url: https://example.com?index=.alerts&timestamp=2026-05-08';

    render(
      <MarkdownErrorBoundary content={rawContent}>
        <ThrowingChild />
      </MarkdownErrorBoundary>
    );

    expect(screen.getByTestId('markdown-render-error')).toBeInTheDocument();
    expect(screen.getByText(rawContent)).toBeInTheDocument();
  });
});
