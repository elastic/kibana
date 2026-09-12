/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlyoutBody, EuiFlyoutHeader, EuiFlyoutResizable, EuiTitle } from '@elastic/eui';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { i18n } from '@kbn/i18n';
import { createEsTraceFetcher, TraceWaterfall, useTraceSpans } from '@kbn/llm-trace-waterfall';
import { useKibana } from '../../../../hooks/use_kibana';

const title = i18n.translate('xpack.agentBuilder.round.traceFlyout.title', {
  defaultMessage: 'Trace',
});

interface RoundTraceFlyoutProps {
  traceId: string;
  onClose: () => void;
}

export const RoundTraceFlyout: React.FC<RoundTraceFlyoutProps> = ({ traceId, onClose }) => {
  const { services } = useKibana();
  const { data } = services.plugins;
  const fetchTrace = useMemo(() => createEsTraceFetcher(data.search.search), [data.search.search]);
  const traceSpansResult = useTraceSpans(traceId, { fetchTrace });

  return (
    <EuiFlyoutResizable
      onClose={onClose}
      aria-labelledby="agentBuilderRoundTraceFlyoutTitle"
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
          <h2 id="agentBuilderRoundTraceFlyoutTitle" style={{ wordBreak: 'break-all' }}>
            {title}: {traceId}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <div style={{ height: '100%', padding: 16 }}>
          <TraceWaterfall
            spans={traceSpansResult.spans}
            traceId={traceId}
            durationMs={traceSpansResult.durationMs}
            isLoading={traceSpansResult.isLoading}
            error={traceSpansResult.error}
          />
        </div>
      </EuiFlyoutBody>
    </EuiFlyoutResizable>
  );
};
