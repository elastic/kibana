/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutResizable,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { KbnInfoCallout } from '@kbn/ui-callout';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { i18n } from '@kbn/i18n';
import { createEsTraceFetcher, TraceWaterfall, useTraceSpans } from '@kbn/llm-trace-waterfall';
import type { TraceSpan } from '@kbn/llm-trace-waterfall';
import { useKibana } from '../../../../hooks/use_kibana';

const labels = {
  title: i18n.translate('xpack.agentBuilder.round.traceFlyout.title', {
    defaultMessage: 'Trace',
  }),
  download: i18n.translate('xpack.agentBuilder.round.traceFlyout.download', {
    defaultMessage: 'Download trace JSON',
  }),
  localFileNotice: i18n.translate('xpack.agentBuilder.round.traceFlyout.localFileNotice', {
    defaultMessage: 'Showing trace data loaded from a local file.',
  }),
};

const triggerDownload = (filename: string, content: string) => {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

interface RoundTraceFlyoutProps {
  traceId?: string;
  initialSpans?: TraceSpan[];
  onClose: () => void;
}

export const RoundTraceFlyout: React.FC<RoundTraceFlyoutProps> = ({
  traceId,
  initialSpans,
  onClose,
}) => {
  const { services } = useKibana();
  const { data } = services.plugins;
  const fetchTrace = useMemo(() => createEsTraceFetcher(data.search.search), [data.search.search]);
  const traceSpansResult = useTraceSpans(traceId ?? null, { fetchTrace });

  const localSpans = initialSpans ?? null;

  const activeSpans = localSpans ?? traceSpansResult.spans;
  const activeDurationMs = localSpans ? undefined : traceSpansResult.durationMs;

  const handleDownload = useCallback(() => {
    if (!activeSpans.length) return;
    const filename = traceId ? `trace-${traceId}.json` : 'trace.json';
    triggerDownload(
      filename,
      JSON.stringify({ trace_id: traceId ?? null, spans: activeSpans }, null, 2)
    );
  }, [traceId, activeSpans]);

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
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem>
            <EuiTitle size="s">
              <h2 id="agentBuilderRoundTraceFlyoutTitle" style={{ wordBreak: 'break-all' }}>
                {traceId ? `${labels.title}: ${traceId}` : labels.title}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          {activeSpans.length > 0 && (
            <EuiFlexItem grow={false}>
              <EuiToolTip content={labels.download} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="download"
                  color="text"
                  aria-label={labels.download}
                  onClick={handleDownload}
                  data-test-subj="traceFlyoutDownloadButton"
                />
              </EuiToolTip>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <div style={{ height: '100%', padding: 16, display: 'flex', flexDirection: 'column' }}>
          {localSpans && (
            <>
              <KbnInfoCallout size="s" title={labels.localFileNotice} />
              <EuiSpacer size="s" />
            </>
          )}
          <div style={{ flex: 1, minHeight: 0 }}>
            <TraceWaterfall
              spans={activeSpans}
              traceId={traceId}
              durationMs={activeDurationMs}
              isLoading={!localSpans && traceSpansResult.isLoading}
              error={!localSpans ? traceSpansResult.error : null}
            />
          </div>
        </div>
      </EuiFlyoutBody>
    </EuiFlyoutResizable>
  );
};
