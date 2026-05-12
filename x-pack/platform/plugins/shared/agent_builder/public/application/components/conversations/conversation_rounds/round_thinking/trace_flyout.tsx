/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlyoutResizable, EuiFlyoutHeader, EuiTitle, EuiFlyoutBody } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { TraceWaterfall, type TraceSpan } from '@kbn/llm-trace-waterfall';

const traceFlyoutTitle = i18n.translate('xpack.agentBuilder.conversation.traceFlyout.title', {
  defaultMessage: 'Trace',
});

interface TraceFlyoutProps {
  traceId: string;
  onClose: () => void;
  spans: TraceSpan[];
  durationMs: number;
  isLoading: boolean;
  error: Error | null;
}

export const TraceFlyout: React.FC<TraceFlyoutProps> = ({
  traceId,
  onClose,
  spans,
  durationMs,
  isLoading,
  error,
}) => {
  return (
    <EuiFlyoutResizable
      onClose={onClose}
      aria-labelledby="traceFlyoutTitle"
      size={620}
      minWidth={400}
      maxWidth={1200}
      ownFocus={false}
      css={css`
        z-index: ${euiThemeVars.euiZFlyout + 4};
        .euiFlyoutBody__overflowContent {
          height: 100%;
          padding: 0;
        }
        .euiFlyoutBody__overflow {
          overflow: hidden;
        }
      `}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id="traceFlyoutTitle" style={{ wordBreak: 'break-all' }}>
            {traceFlyoutTitle}: {traceId}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <div style={{ height: '100%', padding: 16 }}>
          <TraceWaterfall
            spans={spans}
            traceId={traceId}
            durationMs={durationMs}
            isLoading={isLoading}
            error={error}
          />
        </div>
      </EuiFlyoutBody>
    </EuiFlyoutResizable>
  );
};
