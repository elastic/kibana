/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const fallbackTitle = i18n.translate('xpack.agentBuilder.attachments.renderErrorBoundary.title', {
  defaultMessage: "Couldn't render this attachment",
});

interface TimelineRenderErrorBoundaryProps {
  children: () => ReactNode;
  /** Callout title shown when `children` throws. */
  title?: string;
}

interface TimelineRenderErrorBoundaryState {
  hasError: boolean;
}

const RenderContent: React.FC<{ children: () => ReactNode }> = ({ children }) => <>{children()}</>;

export class TimelineRenderErrorBoundary extends Component<
  TimelineRenderErrorBoundaryProps,
  TimelineRenderErrorBoundaryState
> {
  state: TimelineRenderErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('Timeline renderer threw an error', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <EuiCallOut
          announceOnMount
          title={this.props.title ?? fallbackTitle}
          color="warning"
          iconType="warning"
          size="s"
        />
      );
    }

    return <RenderContent>{this.props.children}</RenderContent>;
  }
}
