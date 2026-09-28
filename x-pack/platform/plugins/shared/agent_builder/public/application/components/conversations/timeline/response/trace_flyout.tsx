/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiButtonIcon,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutResizable,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { i18n } from '@kbn/i18n';
import { createEsTraceFetcher, TraceWaterfall, useTraceSpans } from '@kbn/llm-trace-waterfall';
import type { TraceSpan } from '@kbn/llm-trace-waterfall';
import { downloadFileAs } from '@kbn/share-plugin/public';
import { useKibana } from '../../../../hooks/use_kibana';

const labels = {
  title: i18n.translate('xpack.agentBuilder.response.traceFlyout.title', {
    defaultMessage: 'Trace',
  }),
  download: i18n.translate('xpack.agentBuilder.response.traceFlyout.download', {
    defaultMessage: 'Download trace',
  }),
  fromFileCallout: i18n.translate('xpack.agentBuilder.response.traceFlyout.fromFileCallout', {
    defaultMessage: 'Viewing a trace loaded from a file.',
  }),
};

interface TraceFlyoutProps {
  traceId?: string;
  initialSpans?: TraceSpan[];
  onClose: () => void;
}

export const TraceFlyout: React.FC<TraceFlyoutProps> = ({ traceId, initialSpans, onClose }) => {
  const { services } = useKibana();
  const { data } = services.plugins;
  const fetchTrace = useMemo(() => createEsTraceFetcher(data.search.search), [data.search.search]);

  const isFromFile = Boolean(initialSpans);
  const traceSpansResult = useTraceSpans(isFromFile ? null : traceId ?? null, { fetchTrace });

  const spans = useMemo(
    () => (isFromFile ? initialSpans ?? [] : traceSpansResult.spans),
    [isFromFile, initialSpans, traceSpansResult.spans]
  );
  const durationMs = isFromFile ? undefined : traceSpansResult.durationMs;
  const isLoading = isFromFile ? false : traceSpansResult.isLoading;
  const error = isFromFile ? null : traceSpansResult.error;

  const handleDownload = useCallback(() => {
    const slug = traceId
      ? traceId
          .replace(/[^\p{L}\p{N}]+/gu, '-') // replace non-alphanumeric chars (unicode-aware) with hyphens
          .replace(/^-|-$/g, '') // strip leading/trailing hyphens
          .toLowerCase()
      : 'trace';
    const envelope = { ...(traceId ? { trace_id: traceId } : {}), spans };
    downloadFileAs(`trace-${slug}.json`, {
      content: JSON.stringify(envelope, null, 2),
      type: 'application/json',
    });
  }, [traceId, spans]);

  return (
    <EuiFlyoutResizable
      onClose={onClose}
      aria-labelledby="agentBuilderTraceFlyoutTitle"
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
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <EuiTitle size="s">
              <h2 id="agentBuilderTraceFlyoutTitle" style={{ wordBreak: 'break-all' }}>
                {labels.title}
                {traceId ? `: ${traceId}` : ''}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip content={labels.download} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="download"
                aria-label={labels.download}
                onClick={handleDownload}
                color="text"
                size="s"
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <div style={{ height: '100%', padding: 16 }}>
          {isFromFile && (
            <>
              <EuiCallOut announceOnMount size="s" color="primary" iconType="document">
                {labels.fromFileCallout}
              </EuiCallOut>
              <EuiSpacer size="m" />
            </>
          )}
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
