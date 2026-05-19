/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { apm } from '@elastic/apm-rum';

import { MarkdownErrorBoundary } from './markdown_error_boundary';
import { renderWithTestingProviders } from '../../common/mock';

jest.mock('@elastic/apm-rum', () => ({
  apm: { captureError: jest.fn() },
}));

const ThrowingChild = ({ message }: { message: string }) => {
  throw new Error(message);
};

describe('MarkdownErrorBoundary', () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    // React logs caught errors to console.error; silence to keep test output clean.
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('renders children when nothing throws', () => {
    renderWithTestingProviders(
      <MarkdownErrorBoundary source="hello">
        <span data-test-subj="child">child content</span>
      </MarkdownErrorBoundary>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.queryByTestId('markdown-error-boundary')).not.toBeInTheDocument();
  });

  it('shows the fallback when a child throws during render', () => {
    renderWithTestingProviders(
      <MarkdownErrorBoundary source="hello">
        <ThrowingChild message="boom" />
      </MarkdownErrorBoundary>
    );

    expect(screen.getByTestId('markdown-error-boundary')).toBeInTheDocument();
    expect(screen.getByText('This content could not be displayed')).toBeInTheDocument();
  });

  it('captures the error via APM RUM with a labelled component name', () => {
    renderWithTestingProviders(
      <MarkdownErrorBoundary source="hello">
        <ThrowingChild message="parts is not defined" />
      </MarkdownErrorBoundary>
    );

    expect(apm.captureError).toHaveBeenCalledTimes(1);
    const [error, options] = (apm.captureError as jest.Mock).mock.calls[0];
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('parts is not defined');
    expect(options.labels).toEqual({ component: 'CasesMarkdownRenderer' });
    expect(typeof options.custom.componentStack).toBe('string');
  });

  it('reveals the original markdown source on demand', async () => {
    const user = userEvent.setup();
    const source = 'see https://example.com/?index=foo&timestamp=bar';

    renderWithTestingProviders(
      <MarkdownErrorBoundary source={source}>
        <ThrowingChild message="boom" />
      </MarkdownErrorBoundary>
    );

    expect(screen.queryByTestId('markdown-error-boundary-source')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('markdown-error-boundary-toggle-source'));

    expect(screen.getByTestId('markdown-error-boundary-source')).toHaveTextContent(source);
  });

  it('omits the source toggle when no source is provided', () => {
    renderWithTestingProviders(
      <MarkdownErrorBoundary>
        <ThrowingChild message="boom" />
      </MarkdownErrorBoundary>
    );

    expect(screen.queryByTestId('markdown-error-boundary-toggle-source')).not.toBeInTheDocument();
  });
});
