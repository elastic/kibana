/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiCodeBlock } from '@elastic/eui';

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
  }

  static getDerivedStateFromError(): MarkdownErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <EuiCallOut
          title={i18n.MARKDOWN_RENDER_ERROR}
          color="warning"
          iconType="warning"
          size="s"
          data-test-subj="markdown-render-error"
        >
          <EuiCodeBlock isCopyable paddingSize="s" fontSize="s">
            {this.props.content}
          </EuiCodeBlock>
        </EuiCallOut>
      );
    }

    return this.props.children;
  }
}
