/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

interface AttachmentGroupErrorBoundaryState {
  hasError: boolean;
}

interface AttachmentGroupErrorBoundaryProps {
  children: React.ReactNode;
  /** Rendered in place of children when the group renderer throws. */
  fallback?: React.ReactNode;
}

/** Keeps a renderer failure from taking down the whole attachments tab. */
export class AttachmentGroupErrorBoundary extends React.Component<
  AttachmentGroupErrorBoundaryProps,
  AttachmentGroupErrorBoundaryState
> {
  public state: AttachmentGroupErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): AttachmentGroupErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error) {
    window.console.warn('Attachment group renderer failed to render', error);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
