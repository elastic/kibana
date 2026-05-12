/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import type { ReactNode } from 'react';
import { EuiEmptyPrompt, EuiButton, EuiPage, EuiPageBody } from '@elastic/eui';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AesopErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <EuiPage>
          <EuiPageBody>
            <EuiEmptyPrompt
              iconType="error"
              color="danger"
              title={<h2>Something went wrong</h2>}
              body={
                <p>
                  {this.state.error?.message ||
                    'An unexpected error occurred in the AESOP dashboard.'}
                </p>
              }
              actions={
                <EuiButton
                  onClick={() => this.setState({ hasError: false, error: null })}
                  color="danger"
                  aria-label="Try again after error"
                >
                  Try Again
                </EuiButton>
              }
            />
          </EuiPageBody>
        </EuiPage>
      );
    }

    return this.props.children;
  }
}
