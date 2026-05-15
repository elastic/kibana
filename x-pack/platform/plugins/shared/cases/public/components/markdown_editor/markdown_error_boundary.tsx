/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import * as i18n from './translations';

interface MarkdownErrorBoundaryProps {
  content: string;
}

interface MarkdownErrorBoundaryState {
  hasError: boolean;
}

export class MarkdownErrorBoundary extends React.Component<
  React.PropsWithChildren<MarkdownErrorBoundaryProps>,
  MarkdownErrorBoundaryState
> {
  static displayName = 'MarkdownErrorBoundary';

  constructor(props: React.PropsWithChildren<MarkdownErrorBoundaryProps>) {
    super(props);
    this.state = { hasError: false };
    // eslint-disable-next-line no-console
    console.log(
      '[Cases:MarkdownErrorBoundary] constructor called.',
      'content length:',
      props.content?.length,
      'content preview:',
      props.content?.slice(0, 100),
      'has ampersand:',
      props.content?.includes('&'),
      'children type:',
      typeof props.children,
      'children:',
      props.children != null ? 'present' : 'NULL/UNDEFINED'
    );
  }

  static getDerivedStateFromError(error: Error): MarkdownErrorBoundaryState {
    // eslint-disable-next-line no-console
    console.error(
      '[Cases:MarkdownErrorBoundary] getDerivedStateFromError CAUGHT ERROR.',
      'error.message:',
      error?.message,
      'error.name:',
      error?.name,
      'error.stack:',
      error?.stack,
      'error:',
      error
    );
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[Cases:MarkdownErrorBoundary] componentDidCatch DETAILS:', {
      errorMessage: error?.message,
      errorName: error?.name,
      errorStack: error?.stack,
      componentStack: errorInfo?.componentStack,
    });
  }

  componentDidUpdate(_prevProps: React.PropsWithChildren<MarkdownErrorBoundaryProps>) {
    // eslint-disable-next-line no-console
    console.log(
      '[Cases:MarkdownErrorBoundary] componentDidUpdate.',
      'hasError:',
      this.state.hasError,
      'content length:',
      this.props.content?.length
    );
  }

  render() {
    // eslint-disable-next-line no-console
    console.log(
      '[Cases:MarkdownErrorBoundary] render called.',
      'hasError:',
      this.state.hasError,
      'content length:',
      this.props.content?.length,
      'content preview:',
      this.props.content?.slice(0, 80),
      'children type:',
      typeof this.props.children,
      'children:',
      this.props.children != null ? 'present' : 'NULL/UNDEFINED'
    );

    if (this.state.hasError) {
      // eslint-disable-next-line no-console
      console.log(
        '[Cases:MarkdownErrorBoundary] RENDERING FALLBACK (error was caught).',
        'content length:',
        this.props.content?.length,
        'content preview:',
        this.props.content?.slice(0, 200)
      );
      return (
        <div data-test-subj="markdown-render-error">
          <p>{i18n.MARKDOWN_RENDER_ERROR}</p>
          <pre>{this.props.content}</pre>
        </div>
      );
    }

    // eslint-disable-next-line no-console
    console.log('[Cases:MarkdownErrorBoundary] RENDERING CHILDREN (no error).');
    return this.props.children;
  }
}
