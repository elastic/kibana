/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import equal from 'fast-deep-equal';
import React from 'react';

export interface RenderErrorFuncArgs {
  latestError: any;
  resetError: () => void;
}

export type RenderErrorFunc = (renderErrorArgs: RenderErrorFuncArgs) => React.ReactNode;

interface ResettableErrorBoundaryProps<ResetOnChange> {
  renderError: RenderErrorFunc;
  resetOnChange: ResetOnChange;
}

interface ResettableErrorBoundaryState {
  latestError: any;
}

export class ResettableErrorBoundary<ResetOnChange> extends React.Component<
  React.PropsWithChildren<ResettableErrorBoundaryProps<ResetOnChange>>,
  ResettableErrorBoundaryState
> {
  state: ResettableErrorBoundaryState = {
    latestError: undefined,
  };

  componentDidUpdate({
    resetOnChange: prevResetOnChange,
  }: ResettableErrorBoundaryProps<ResetOnChange>) {
    const { resetOnChange } = this.props;
    const { latestError } = this.state;

    if (latestError != null && !equal(resetOnChange, prevResetOnChange)) {
      this.resetError();
    }
  }

  static getDerivedStateFromError(error: any) {
    return {
      latestError: error,
    };
  }

  render() {
    const { children, renderError } = this.props;
    const { latestError } = this.state;

    if (latestError != null) {
      return renderError({
        latestError,
        resetError: this.resetError,
      });
    }

    return children;
  }

  resetError = () => {
    this.setState((previousState) => ({
      ...previousState,
      latestError: undefined,
    }));
  };
}
