/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

interface DrilldownErrorBoundaryState {
  hasError: boolean;
}

/**
 * Contains a failing drill-down to its own row.
 *
 * The drill-down comes from whichever plugin owns the attachment type and is rendered inside the
 * summary's own fiber, so an exception — a lazily loaded chunk missing after a deploy, a provider
 * throwing — would otherwise take down the surface hosting the summary. It renders nothing to
 * begin with, so there is nothing to fall back to: the row simply stops being able to open.
 */
export class DrilldownErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  DrilldownErrorBoundaryState
> {
  public state: DrilldownErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): DrilldownErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error) {
    window.console.warn('Attachment summary drill-down failed to render', error);
  }

  public render() {
    return this.state.hasError ? null : this.props.children;
  }
}
