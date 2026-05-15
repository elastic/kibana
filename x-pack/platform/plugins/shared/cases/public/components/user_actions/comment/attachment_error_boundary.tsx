/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import * as i18n from './translations';

interface AttachmentErrorBoundaryProps {
  attachmentId: string;
}

interface AttachmentErrorBoundaryState {
  hasError: boolean;
  errorMessage: string | null;
}

export class AttachmentErrorBoundary extends React.Component<
  React.PropsWithChildren<AttachmentErrorBoundaryProps>,
  AttachmentErrorBoundaryState
> {
  static displayName = 'AttachmentErrorBoundary';

  constructor(props: React.PropsWithChildren<AttachmentErrorBoundaryProps>) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
    // eslint-disable-next-line no-console
    console.log(
      '[Cases:AttachmentErrorBoundary] constructor.',
      'attachmentId:',
      props.attachmentId,
      'children type:',
      typeof props.children,
      'children:',
      props.children != null ? 'present' : 'NULL/UNDEFINED'
    );
  }

  static getDerivedStateFromError(error: Error): AttachmentErrorBoundaryState {
    // eslint-disable-next-line no-console
    console.error(
      '[Cases:AttachmentErrorBoundary] getDerivedStateFromError CAUGHT ERROR.',
      'error.message:',
      error?.message,
      'error.name:',
      error?.name,
      'error.stack:',
      error?.stack,
      'error:',
      error
    );
    return { hasError: true, errorMessage: error?.message ?? null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[Cases:AttachmentErrorBoundary] componentDidCatch DETAILS:', {
      attachmentId: this.props.attachmentId,
      errorMessage: error?.message,
      errorName: error?.name,
      errorStack: error?.stack,
      componentStack: errorInfo?.componentStack,
    });
  }

  componentDidUpdate() {
    // eslint-disable-next-line no-console
    console.log(
      '[Cases:AttachmentErrorBoundary] componentDidUpdate.',
      'attachmentId:',
      this.props.attachmentId,
      'hasError:',
      this.state.hasError
    );
  }

  render() {
    // eslint-disable-next-line no-console
    console.log(
      '[Cases:AttachmentErrorBoundary] render.',
      'attachmentId:',
      this.props.attachmentId,
      'hasError:',
      this.state.hasError,
      'errorMessage:',
      this.state.errorMessage
    );

    if (this.state.hasError) {
      return (
        <div data-test-subj="attachment-render-error">
          <p>{i18n.ATTACHMENT_RENDER_ERROR}</p>
          {this.state.errorMessage ? <pre>{this.state.errorMessage}</pre> : null}
        </div>
      );
    }

    return this.props.children;
  }
}
