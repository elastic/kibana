/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CSSProperties, ReactNode } from 'react';
import React, { useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiTitle,
  euiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import {
  FlowCanvasDataProductTextBadge,
  type FlowCanvasDataProduct,
} from './ingest_hub_demo_streams_flow_card_badge_row';
import { IngestHubDemoStreamsFlowCardIconTile } from './ingest_hub_demo_streams_flow_card_icon_tile';
import {
  INGEST_HUB_DEMO_STREAMS_FLOW_CARD_HEADER_TO_STATS_GAP_PX,
  ingestHubDemoStreamsFlowCardBodyCss,
  ingestHubDemoStreamsFlowCardPanelInsetStyle,
} from './ingest_hub_demo_streams_flow_card_layout';
import { ingestHubDemoStreamsFlowCardShellStyle } from './ingest_hub_demo_streams_flow_card_shell_styles';
import { FlowCanvasTruncationTooltip } from './ingest_hub_demo_streams_flow_truncation_tooltip';

/** Space between the icon tile and the title (design spec). */
const HEADER_ICON_TITLE_GAP_PX = 12;
/** Space between the truncated title and the Logs / Metrics badge cluster. */
const TITLE_TO_DATA_PRODUCT_BADGES_GAP_PX = 12;

export interface IngestHubDemoStreamsFlowDestinationCardProps {
  readonly title: ReactNode;
  /** Full stream name (or demo label) for truncation tooltip content. */
  readonly titleTooltip: string;
  readonly metricsLine: string;
  readonly quality?: 'good' | 'degraded' | 'poor';
  readonly dataProduct: FlowCanvasDataProduct;
  readonly trailingAction?: ReactNode;
  readonly dimmed: boolean;
}

export function IngestHubDemoStreamsFlowDestinationCard({
  title,
  titleTooltip,
  metricsLine,
  quality,
  dataProduct,
  trailingAction,
  dimmed,
}: IngestHubDemoStreamsFlowDestinationCardProps) {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;

  const rowEllipsis: CSSProperties = {
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    margin: 0,
  };

  const resolvedQuality = quality ?? 'good';

  const cardBorderColor = useMemo(() => {
    if (resolvedQuality === 'poor') {
      return euiTheme.colors.danger;
    }
    if (resolvedQuality === 'degraded') {
      return euiTheme.colors.warning;
    }
    return euiTheme.colors.borderBasePlain;
  }, [euiTheme, resolvedQuality]);

  const panelCss = useMemo(
    () => css`
      border-radius: 6px;
      width: 100%;
      min-width: 0;
      height: 100%;
      box-sizing: border-box;
      overflow: hidden;
      border: ${euiTheme.border.width.thin} solid ${cardBorderColor};
    `,
    [cardBorderColor, euiTheme.border.width.thin]
  );

  const cardBodyCss = useMemo(() => css(ingestHubDemoStreamsFlowCardBodyCss), []);

  const statsRowMarginTopPx = INGEST_HUB_DEMO_STREAMS_FLOW_CARD_HEADER_TO_STATS_GAP_PX;

  const statsTextCss = useMemo(
    () => css`
      ${euiFontSize(euiThemeContext, 'xxs')}
    `,
    [euiThemeContext]
  );

  return (
    <div style={ingestHubDemoStreamsFlowCardShellStyle(dimmed)}>
      <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none" color="plain" css={panelCss}>
        <div style={ingestHubDemoStreamsFlowCardPanelInsetStyle}>
          <div css={cardBodyCss}>
            <EuiFlexGroup
              alignItems="center"
              gutterSize="none"
              responsive={false}
              wrap={false}
              justifyContent="flexStart"
              css={css`
                width: 100%;
                max-width: 100%;
                min-width: 0;
              `}
            >
              <EuiFlexItem
                grow={false}
                css={css`
                  margin-inline-end: ${HEADER_ICON_TITLE_GAP_PX}px;
                `}
              >
                <IngestHubDemoStreamsFlowCardIconTile iconType="layers" qualityStatus={quality} />
              </EuiFlexItem>
              <EuiFlexItem grow style={{ minWidth: 0 }}>
                <EuiFlexGroup
                  alignItems="center"
                  gutterSize="none"
                  responsive={false}
                  wrap={false}
                  css={css`
                    width: 100%;
                    max-width: 100%;
                    min-width: 0;
                  `}
                >
                  <EuiFlexItem grow style={{ minWidth: 0 }}>
                    <EuiTitle size="xxxs">
                      <span>
                        <FlowCanvasTruncationTooltip tooltipContent={titleTooltip}>
                          {title}
                        </FlowCanvasTruncationTooltip>
                      </span>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem
                    grow={false}
                    css={css`
                      flex-shrink: 0;
                      padding-inline-start: ${TITLE_TO_DATA_PRODUCT_BADGES_GAP_PX}px;
                    `}
                  >
                    <FlowCanvasDataProductTextBadge dataProduct={dataProduct} />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              {trailingAction ? (
                <EuiFlexItem
                  grow={false}
                  css={css({
                    flexShrink: 0,
                    marginLeft: 'auto',
                    paddingInlineStart: '8px',
                  })}
                >
                  <span style={{ flexShrink: 0 }}>{trailingAction}</span>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
            <EuiText
              size="relative"
              color="subdued"
              component="p"
              grow={false}
              textAlign="left"
              css={statsTextCss}
              style={{
                ...rowEllipsis,
                marginTop: statsRowMarginTopPx,
                marginBottom: 0,
              }}
            >
              {metricsLine}
            </EuiText>
          </div>
        </div>
      </EuiPanel>
    </div>
  );
}
