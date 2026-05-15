/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CSSProperties } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiButton,
  EuiButtonGroup,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiPanel,
  EuiPopover,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { useTimeRange } from '../../hooks/use_time_range';
import { AWS_MOCK_STREAMS } from './ingest_hub_demo_streams_model';
import {
  filterMockAwsStreamsBySearchQuery,
  MOCK_AWS_STREAMS_LIST_FULLY_EXPANDED,
} from './ingest_hub_demo_streams_list_search';
import {
  IngestHubDemoStreamsFlowPipelineCanvas,
  type IngestHubDemoStreamsFlowPipelineCanvasRef,
} from './ingest_hub_demo_streams_flow_pipeline_canvas';

const CANVAS_PADDING_PX = 16;
/** Shared height for zoom controls and the fullscreen / customize button group (px). */
const CANVAS_TOOLBAR_CONTROL_HEIGHT_PX = 28;

const CANVAS_ACTION_FULLSCREEN_ID = 'streamsCanvasToolbarFullscreen';
const CANVAS_ACTION_CUSTOMIZE_ID = 'streamsCanvasToolbarCustomize';

export function MockAwsStreamsCanvas() {
  const { euiTheme } = useEuiTheme();
  const router = useStreamsAppRouter();
  const { rangeFrom, rangeTo } = useTimeRange();
  const canvasPanelRef = useRef<HTMLDivElement | null>(null);
  const pipelineCanvasRef = useRef<IngestHubDemoStreamsFlowPipelineCanvasRef | null>(null);
  const [isCanvasFullScreen, setIsCanvasFullScreen] = useState(false);
  const [isCanvasCustomizeFlyoutOpen, setIsCanvasCustomizeFlyoutOpen] = useState(false);
  const [canvasZoomPercent, setCanvasZoomPercent] = useState(100);
  const [isZoomMenuOpen, setIsZoomMenuOpen] = useState(false);
  const customizeCanvasFlyoutTitleId = useGeneratedHtmlId({
    prefix: 'ingestHubDemoStreamsCanvasCustomize',
  });
  const zoomMenuPopoverId = useGeneratedHtmlId({ prefix: 'ingestHubDemoStreamsCanvasZoomMenu' });

  const isMacLikePlatform = useMemo(() => {
    if (typeof navigator === 'undefined') {
      return false;
    }
    return /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }, []);

  const onPipelineCameraZoomChange = useCallback((zoom: number) => {
    setCanvasZoomPercent(Math.round(zoom * 100));
  }, []);

  const closeZoomMenu = useCallback(() => {
    setIsZoomMenuOpen(false);
  }, []);

  const toggleZoomMenu = useCallback(() => {
    setIsZoomMenuOpen((open) => !open);
  }, []);

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

  const structuralRoot = useMemo(() => AWS_MOCK_STREAMS.find((r) => r.isRootStream), []);

  const visibleRows = useMemo(
    () =>
      filterMockAwsStreamsBySearchQuery(
        AWS_MOCK_STREAMS,
        undefined,
        MOCK_AWS_STREAMS_LIST_FULLY_EXPANDED
      ),
    []
  );

  const visibleRoot = useMemo(() => visibleRows.find((r) => r.isRootStream), [visibleRows]);
  const visibleChildStreams = useMemo(
    () => visibleRows.filter((r) => !r.isRootStream),
    [visibleRows]
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

  const canvasToolbarClusterCss = useMemo(
    () => css`
      align-items: center;
      gap: ${euiTheme.size.xs};
    `,
    [euiTheme.size.xs]
  );

  const canvasZoomMenuTriggerCss = useMemo(
    () => css`
      &.euiButton {
        block-size: ${CANVAS_TOOLBAR_CONTROL_HEIGHT_PX}px;
        min-block-size: ${CANVAS_TOOLBAR_CONTROL_HEIGHT_PX}px;
        border-radius: ${euiTheme.border.radius.small};
        border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};
        background-color: ${euiTheme.colors.backgroundBasePlain};
        padding-inline: ${euiTheme.size.s};
        font-weight: ${euiTheme.font.weight.medium};
      }
      &.euiButton:hover,
      &.euiButton:focus {
        background-color: ${euiTheme.colors.backgroundBasePlain};
      }
    `,
    [
      euiTheme.border.radius.small,
      euiTheme.border.width.thin,
      euiTheme.colors,
      euiTheme.font.weight.medium,
      euiTheme.size.s,
    ]
  );

  const canvasToolbarLegend = useMemo(
    () =>
      i18n.translate('xpack.streams.ingestHubDemoStreamsCanvas.toolbarLegend', {
        defaultMessage: 'Canvas actions',
      }),
    []
  );

  const fullScreenButtonAria = useMemo(
    () =>
      isCanvasFullScreen
        ? i18n.translate('xpack.streams.ingestHubDemoStreamsCanvas.exitFullScreen', {
            defaultMessage: 'Exit full screen',
          })
        : i18n.translate('xpack.streams.ingestHubDemoStreamsCanvas.enterFullScreen', {
            defaultMessage: 'Enter full screen',
          }),
    [isCanvasFullScreen]
  );

  const customizeCanvasTitle = useMemo(
    () =>
      i18n.translate('xpack.streams.ingestHubDemoStreamsCanvas.customizeCanvas', {
        defaultMessage: 'Customize canvas',
      }),
    []
  );

  const canvasActionsOptions = useMemo(
    () => [
      {
        id: CANVAS_ACTION_FULLSCREEN_ID,
        label: fullScreenButtonAria,
        iconType: (isCanvasFullScreen ? 'fullScreenExit' : 'fullScreen') as const,
        'data-test-subj': 'streamsMockAwsStreamsCanvasFullScreen',
      },
      {
        id: CANVAS_ACTION_CUSTOMIZE_ID,
        label: customizeCanvasTitle,
        iconType: 'gear' as const,
        'data-test-subj': 'streamsMockAwsStreamsCanvasCustomize',
      },
    ],
    [customizeCanvasTitle, fullScreenButtonAria, isCanvasFullScreen]
  );

  const canvasActionsIdToSelectedMap = useMemo(
    () => ({
      [CANVAS_ACTION_FULLSCREEN_ID]: isCanvasFullScreen,
      [CANVAS_ACTION_CUSTOMIZE_ID]: isCanvasCustomizeFlyoutOpen,
    }),
    [isCanvasCustomizeFlyoutOpen, isCanvasFullScreen]
  );

  const toggleCustomizeFlyout = useCallback(() => {
    setIsCanvasCustomizeFlyoutOpen((open) => !open);
  }, []);

  const onCanvasToolbarActionsChange = useCallback(
    (optionId: string) => {
      if (optionId === CANVAS_ACTION_FULLSCREEN_ID) {
        void toggleCanvasFullScreen();
      } else if (optionId === CANVAS_ACTION_CUSTOMIZE_ID) {
        toggleCustomizeFlyout();
      }
    },
    [toggleCanvasFullScreen, toggleCustomizeFlyout]
  );

  const zoomInShortcut = useMemo(() => (isMacLikePlatform ? '⌘+' : 'Ctrl+='), [isMacLikePlatform]);
  const zoomOutShortcut = useMemo(() => (isMacLikePlatform ? '⌘−' : 'Ctrl+-'), [isMacLikePlatform]);
  const zoomFitShortcut = useMemo(
    () => (isMacLikePlatform ? '⇧1' : 'Shift+1'),
    [isMacLikePlatform]
  );
  const zoom100Shortcut = useMemo(() => (isMacLikePlatform ? '⌘0' : 'Ctrl+0'), [isMacLikePlatform]);

  const zoomMenuButtonAria = useMemo(
    () =>
      i18n.translate('xpack.streams.ingestHubDemoStreamsCanvas.zoomMenuButtonAria', {
        defaultMessage: 'Zoom options',
      }),
    []
  );

  const zoomMenuItems = useMemo(
    () => [
      <EuiContextMenuItem
        key="zoom-in"
        shortcut={zoomInShortcut}
        onClick={() => {
          closeZoomMenu();
          pipelineCanvasRef.current?.zoomIn();
        }}
        data-test-subj="streamsMockAwsStreamsCanvasZoomMenuZoomIn"
      >
        {i18n.translate('xpack.streams.ingestHubDemoStreamsCanvas.zoomMenuZoomIn', {
          defaultMessage: 'Zoom in',
        })}
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        key="zoom-out"
        shortcut={zoomOutShortcut}
        onClick={() => {
          closeZoomMenu();
          pipelineCanvasRef.current?.zoomOut();
        }}
        data-test-subj="streamsMockAwsStreamsCanvasZoomMenuZoomOut"
      >
        {i18n.translate('xpack.streams.ingestHubDemoStreamsCanvas.zoomMenuZoomOut', {
          defaultMessage: 'Zoom out',
        })}
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        key="zoom-fit"
        shortcut={zoomFitShortcut}
        onClick={() => {
          closeZoomMenu();
          pipelineCanvasRef.current?.zoomToFit();
        }}
        data-test-subj="streamsMockAwsStreamsCanvasZoomMenuZoomToFit"
      >
        {i18n.translate('xpack.streams.ingestHubDemoStreamsCanvas.zoomMenuZoomToFit', {
          defaultMessage: 'Zoom to fit',
        })}
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        key="zoom-50"
        onClick={() => {
          closeZoomMenu();
          pipelineCanvasRef.current?.zoomToPreset(50);
        }}
        data-test-subj="streamsMockAwsStreamsCanvasZoomMenuZoom50"
      >
        {i18n.translate('xpack.streams.ingestHubDemoStreamsCanvas.zoomMenuZoom50', {
          defaultMessage: 'Zoom to 50%',
        })}
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        key="zoom-100"
        shortcut={zoom100Shortcut}
        onClick={() => {
          closeZoomMenu();
          pipelineCanvasRef.current?.zoomToPreset(100);
        }}
        data-test-subj="streamsMockAwsStreamsCanvasZoomMenuZoom100"
      >
        {i18n.translate('xpack.streams.ingestHubDemoStreamsCanvas.zoomMenuZoom100', {
          defaultMessage: 'Zoom to 100%',
        })}
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        key="zoom-200"
        onClick={() => {
          closeZoomMenu();
          pipelineCanvasRef.current?.zoomToPreset(200);
        }}
        data-test-subj="streamsMockAwsStreamsCanvasZoomMenuZoom200"
      >
        {i18n.translate('xpack.streams.ingestHubDemoStreamsCanvas.zoomMenuZoom200', {
          defaultMessage: 'Zoom to 200%',
        })}
      </EuiContextMenuItem>,
    ],
    [closeZoomMenu, zoom100Shortcut, zoomFitShortcut, zoomInShortcut, zoomOutShortcut]
  );

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

  if (!structuralRoot) {
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
            <EuiFlexItem grow={false}>
              <EuiFlexGroup
                alignItems="center"
                justifyContent="flexEnd"
                gutterSize="s"
                responsive={false}
                wrap
                data-test-subj="streamsMockAwsStreamsCanvasControlsRow"
              >
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup
                    alignItems="center"
                    gutterSize="none"
                    responsive={false}
                    className={canvasToolbarClusterCss}
                    data-test-subj="streamsMockAwsStreamsCanvasZoomToolbar"
                  >
                    {visibleRows.length > 0 ? (
                      <EuiFlexItem grow={false}>
                        <EuiPopover
                          id={zoomMenuPopoverId}
                          button={
                            <EuiButton
                              size="s"
                              color="text"
                              iconType="arrowDown"
                              iconSide="right"
                              minWidth={false}
                              onClick={toggleZoomMenu}
                              aria-label={zoomMenuButtonAria}
                              data-test-subj="streamsMockAwsStreamsCanvasZoomMenuButton"
                              css={canvasZoomMenuTriggerCss}
                            >
                              {i18n.translate(
                                'xpack.streams.ingestHubDemoStreamsCanvas.zoomPercentLabel',
                                {
                                  defaultMessage: '{pct}%',
                                  values: { pct: canvasZoomPercent },
                                }
                              )}
                            </EuiButton>
                          }
                          isOpen={isZoomMenuOpen}
                          closePopover={closeZoomMenu}
                          panelPaddingSize="none"
                          anchorPosition="downRight"
                        >
                          <EuiContextMenuPanel size="s" items={zoomMenuItems} />
                        </EuiPopover>
                      </EuiFlexItem>
                    ) : null}
                    <EuiFlexItem grow={false}>
                      <EuiButtonGroup
                        legend={canvasToolbarLegend}
                        options={canvasActionsOptions}
                        type="multi"
                        idToSelectedMap={canvasActionsIdToSelectedMap}
                        onChange={onCanvasToolbarActionsChange}
                        buttonSize="compressed"
                        color="text"
                        isIconOnly
                        data-test-subj="streamsMockAwsStreamsCanvasToolbar"
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
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
              {visibleRows.length === 0 ? (
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
                    ref={pipelineCanvasRef}
                    visibleRoot={visibleRoot}
                    visibleLeaves={visibleChildStreams}
                    buildStreamHref={buildStreamHref}
                    onStreamNavigate={onStreamNavigate}
                    onCameraZoomChange={onPipelineCameraZoomChange}
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
