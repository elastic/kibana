/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import type { UseEuiTheme } from '@elastic/eui';
import { EuiCallOut } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

interface DashboardRendererErrorBoundaryProps {
  resetKey: unknown;
  children?: React.ReactNode;
}

interface InnerBoundaryState {
  hasError: boolean;
}

class InnerBoundary extends React.Component<{ children?: React.ReactNode }, InnerBoundaryState> {
  state: InnerBoundaryState = { hasError: false };

  static getDerivedStateFromError(): InnerBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <DashboardPreviewErrorCallout />;
    }
    return this.props.children;
  }
}

export const DashboardRendererErrorBoundary = ({
  resetKey,
  children,
}: DashboardRendererErrorBoundaryProps) => {
  const previousResetKey = useRef(resetKey);
  const [boundaryKey, setBoundaryKey] = useState(0);

  useEffect(() => {
    if (previousResetKey.current !== resetKey) {
      previousResetKey.current = resetKey;
      setBoundaryKey((value) => value + 1);
    }
  }, [resetKey]);

  return <InnerBoundary key={boundaryKey}>{children}</InnerBoundary>;
};

export const DashboardPreviewErrorCallout = ({}: {}) => (
  <div
    css={({ euiTheme }: UseEuiTheme) =>
      css({
        marginLeft: euiTheme.size.s,
        marginRight: euiTheme.size.s,
      })
    }
  >
    <EuiCallOut
      announceOnMount
      color="danger"
      iconType="error"
      title={i18n.translate('xpack.dashboardAgent.attachments.dashboard.previewErrorCalloutTitle', {
        defaultMessage: 'This dashboard preview could not be rendered.',
      })}
      data-test-subj="dashboardRendererError"
    >
      {i18n.translate('xpack.dashboardAgent.attachments.dashboard.previewErrorCalloutBody', {
        defaultMessage: 'Ask the agent to repair the invalid or incomplete dashboard state.',
      })}
    </EuiCallOut>
  </div>
);
