/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { EuiCallOut, EuiButton, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface Props {
  /** Human-readable label for the region (shown in the fallback). */
  section: string;
  children: ReactNode;
  /**
   * If true, render nothing instead of a callout when an error is
   * caught. Useful for non-critical UI like the feature tour where a
   * visible error panel would be more disruptive than silently hiding.
   */
  silent?: boolean;
}

interface State {
  error: Error | null;
}

/**
 * Lightweight React error boundary for entity-centric lab sections.
 *
 * Catches render-time errors in its subtree and displays a compact
 * callout with a "Retry" button instead of crashing the entire page.
 * Each boundary is independent: a crash in the hex grid, list view,
 * or flyout only affects that panel.
 */
export class EntityErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error(`[EntityErrorBoundary] ${this.props.section}:`, error, info);
  }

  private handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      if (this.props.silent) {
        return null;
      }
      return (
        <>
          <EuiCallOut
            title={i18n.translate(
              'xpack.streams.entityCentricLab.errorBoundary.title',
              {
                defaultMessage: 'Something went wrong in {section}',
                values: { section: this.props.section },
              }
            )}
            color="danger"
            iconType="error"
            size="s"
          >
            <p>{this.state.error.message}</p>
            <EuiSpacer size="s" />
            <EuiButton size="s" color="danger" onClick={this.handleRetry}>
              {i18n.translate(
                'xpack.streams.entityCentricLab.errorBoundary.retry',
                { defaultMessage: 'Retry' }
              )}
            </EuiButton>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      );
    }
    return this.props.children;
  }
}
