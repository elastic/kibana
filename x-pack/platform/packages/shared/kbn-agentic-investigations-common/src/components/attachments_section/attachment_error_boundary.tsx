/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

interface State {
  hasError: boolean;
}

/** Prevents a broken attachment pill from taking down the rest of the Attachments section. */
export class AttachmentErrorBoundary extends React.Component<React.PropsWithChildren<{}>, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error) {
    window.console.warn('Attachment conversation-details renderer failed', error);
  }

  public render() {
    return this.state.hasError ? null : this.props.children;
  }
}
