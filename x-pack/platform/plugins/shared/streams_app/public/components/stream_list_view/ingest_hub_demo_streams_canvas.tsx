/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CSSProperties } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { useTimeRange } from '../../hooks/use_time_range';
import { AWS_LOGS_MOCK_STREAMS, AWS_LOGS_WIRED_STREAM_TOPOLOGY } from '../ingest_hub_aws_logs_demo_data';
import {
  filterMockAwsStreamsBySearchQuery,
  MOCK_AWS_STREAMS_LIST_FULLY_EXPANDED,
} from './ingest_hub_demo_streams_list_search';
import { IngestHubDemoStreamsFlowPipelineCanvas } from './ingest_hub_demo_streams_flow_pipeline_canvas';

const CANVAS_PADDING_PX = 8;

export function MockAwsStreamsCanvas() {
  const { euiTheme } = useEuiTheme();
  const router = useStreamsAppRouter();
  const { rangeFrom, rangeTo } = useTimeRange();
  const canvasPanelRef = useRef<HTMLDivElement | null>(null);
  const [isCanvasFullScreen, setIsCanvasFullScreen] = useState(false);
  const [isCanvasCustomizeFlyoutOpen, setIsCanvasCustomizeFlyoutOpen] = useState(false);
  const customizeCanvasFlyoutTitleId = useGeneratedHtmlId({
    prefix: 'ingestHubDemoStreamsCanvasCustomize',
  });

  const mockCanvasRootCss = useMemo(
    () => css`
      flex: 1;
      min-height: 0;
      align-self: stretch;
      display: flex;
      flex-direction: column;
    `,
    []
  );

  useEffect(() => {
    const onFullScreenChange = () => {
      setIsCanvasFullScreen(document.fullscreenElement === canvasPanelRef.current);
    };
    document.addEventListener('fullscreenchange', onFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullScreenChange);
  }, []);

  const toggleCanvasFullScreen = useCallback(async () => {
    const el = canvasPanelRef.current;
    if (!el) {
      return;
    }
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch {
      // Fullscreen API may be unavailable or denied.
    }
  }, []);

  const visibleStreams = useMemo(
    () =>
      filterMockAwsStreamsBySearchQuery(
        AWS_LOGS_MOCK_STREAMS,
        undefined,
        MOCK_AWS_STREAMS_LIST_FULLY_EXPANDED
      ),
    []
  );

  const canvasShellStyle: CSSProperties = useMemo(
    () => ({
      position: 'relative',
      flex: 1,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
      borderRadius: euiTheme.border.radius.medium,
      border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued}`,
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
      backgroundImage: `radial-gradient(${euiTheme.colors.borderBaseSubdued} 1px, transparent 0)`,
      backgroundSize: '14px 14px',
      paddingTop: CANVAS_PADDING_PX,
      paddingLeft: CANVAS_PADDING_PX,
      paddingRight: CANVAS_PADDING_PX,
      paddingBottom: CANVAS_PADDING_PX,
    }),
    [euiTheme]
  );

  const customizeCanvasTitle = useMemo(
    () =>
      i18n.translate('xpack.streams.ingestHubDemoStreamsCanvas.customizeCanvas', {
        defaultMessage: 'Customize canvas',
      }),
    []
  );

  const toggleCustomizeFlyout = useCallback(() => {
    setIsCanvasCustomizeFlyoutOpen((open) => !open);
  }, []);

  const buildStreamHref = useCallback(
    (streamName: string) =>
      router.link('/{key}', {
        path: { key: streamName },
        query: { rangeFrom, rangeTo },
      }),
    [router, rangeFrom, rangeTo]
  );

  const onStreamNavigate = useCallback(
    (streamName: string) => {
      void router.push('/{key}', {
        path: { key: streamName },
        query: { rangeFrom, rangeTo },
      });
    },
    [router, rangeFrom, rangeTo]
  );

  if (visibleStreams.length === 0 && AWS_LOGS_MOCK_STREAMS.length === 0) {
    return null;
  }

  const noMatchingStreamsMessage = i18n.translate(
    'xpack.streams.ingestHubDemoStreamsCanvas.noMatchingStreams',
    {
      defaultMessage: 'No streams match your search.',
    }
  );

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      alignItems="stretch"
      className={mockCanvasRootCss}
      data-test-subj="streamsMockAwsStreamsCanvas"
    >
      <EuiFlexItem grow style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <EuiPanel
          panelRef={canvasPanelRef}
          hasBorder={false}
          hasShadow={false}
          paddingSize="none"
          grow
          style={canvasShellStyle}
        >
          <EuiFlexGroup
            direction="column"
            gutterSize="s"
            alignItems="stretch"
            responsive={false}
            style={{ flex: 1, minHeight: 0 }}
          >
            <EuiFlexItem grow style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              {isCanvasCustomizeFlyoutOpen ? (
                <EuiFlyout
                  ownFocus
                  size="s"
                  maxWidth={360}
                  onClose={() => setIsCanvasCustomizeFlyoutOpen(false)}
                  aria-labelledby={customizeCanvasFlyoutTitleId}
                >
                  <EuiFlyoutHeader hasBorder>
                    <EuiTitle size="m">
                      <h2 id={customizeCanvasFlyoutTitleId}>{customizeCanvasTitle}</h2>
                    </EuiTitle>
                  </EuiFlyoutHeader>
                  <EuiFlyoutBody>
                    <EuiText size="s" color="subdued">
                      {i18n.translate(
                        'xpack.streams.ingestHubDemoStreamsCanvas.customizeCanvasDescription',
                        {
                          defaultMessage:
                            'Adjust how streams are arranged on the canvas. Additional layout options will appear here as this experience evolves.',
                        }
                      )}
                    </EuiText>
                  </EuiFlyoutBody>
                </EuiFlyout>
              ) : null}
              {visibleStreams.length === 0 ? (
                <EuiFlexGroup
                  alignItems="center"
                  justifyContent="center"
                  responsive={false}
                  style={{ flex: 1, minHeight: 200 }}
                >
                  <EuiFlexItem grow={false}>
                    <EuiText size="s" color="subdued" textAlign="center">
                      {noMatchingStreamsMessage}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              ) : (
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                  }}
                >
                  <IngestHubDemoStreamsFlowPipelineCanvas
                    topology={AWS_LOGS_WIRED_STREAM_TOPOLOGY}
                    buildStreamHref={buildStreamHref}
                    onStreamNavigate={onStreamNavigate}
                    onToggleFullscreen={toggleCanvasFullScreen}
                    isFullscreen={isCanvasFullScreen}
                    onOpenCanvasSettings={toggleCustomizeFlyout}
                  />
                </div>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
