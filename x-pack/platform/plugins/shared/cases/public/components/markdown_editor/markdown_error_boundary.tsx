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
      '[Cases:MarkdownErrorBoundary] constructor called, content length:',
      props.content?.length
    );
  }

  static getDerivedStateFromError(error: Error): MarkdownErrorBoundaryState {
    // eslint-disable-next-line no-console
    console.error(
      '[Cases:MarkdownErrorBoundary] getDerivedStateFromError caught error:',
      error?.message,
      error
    );
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[Cases:MarkdownErrorBoundary] componentDidCatch:', {
      errorMessage: error?.message,
      errorName: error?.name,
      errorStack: error?.stack,
      componentStack: errorInfo?.componentStack,
    });
  }

  render() {
    // eslint-disable-next-line no-console
    console.log('[Cases:MarkdownErrorBoundary] render called, hasError:', this.state.hasError);

    if (this.state.hasError) {
      // eslint-disable-next-line no-console
      console.log(
        '[Cases:MarkdownErrorBoundary] rendering fallback for content length:',
        this.props.content?.length
      );
      return (
        <div data-test-subj="markdown-render-error">
          <p>{i18n.MARKDOWN_RENDER_ERROR}</p>
          <pre>{this.props.content}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}
