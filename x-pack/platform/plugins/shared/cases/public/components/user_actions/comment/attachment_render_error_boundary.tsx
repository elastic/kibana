/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, type ReactNode } from 'react';
import { AttachmentErrorCallout } from './attachment_error_callout';
import { ATTACHMENT_RENDER_ERROR } from './translations';

interface AttachmentRenderErrorBoundaryProps {
  children: ReactNode;
}

interface AttachmentRenderErrorBoundaryState {
  hasError: boolean;
}

/**
 * Isolates a single attachment renderer so a throw (including from a third-party
 * or embeddable renderer's effects) degrades to an inline callout instead of
 * unmounting the whole case view. React still logs the original error to the
 * console when it is caught here.
 */
export class AttachmentRenderErrorBoundary extends Component<
  AttachmentRenderErrorBoundaryProps,
  AttachmentRenderErrorBoundaryState
> {
  static displayName = 'AttachmentRenderErrorBoundary';

  state: AttachmentRenderErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <AttachmentErrorCallout
          announceOnMount
          title={ATTACHMENT_RENDER_ERROR}
          data-test-subj="attachment-render-error"
        />
      );
    }

    return this.props.children;
  }
}
