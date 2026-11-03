/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

interface AttachmentErrorBoundaryState {
  hasError: boolean;
}

export class AttachmentErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  AttachmentErrorBoundaryState
> {
  public state: AttachmentErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): AttachmentErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error) {
    window.console.warn('Grouped attachment failed to render', error);
  }

  public render() {
    return this.state.hasError ? null : this.props.children;
  }
}
