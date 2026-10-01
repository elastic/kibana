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

/** Keeps a drill-down failure from taking down the surface hosting the summary. */
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
