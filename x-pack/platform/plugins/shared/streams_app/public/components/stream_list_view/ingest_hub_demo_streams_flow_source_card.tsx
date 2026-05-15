/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CSSProperties } from 'react';
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
import {
  FLOW_CARD_QUALITY_BADGE_OVERFLOW_BELOW_ICON_TILE_PX,
  IngestHubDemoStreamsFlowCardIconTile,
} from './ingest_hub_demo_streams_flow_card_icon_tile';
import { FlowCanvasTruncationTooltip } from './ingest_hub_demo_streams_flow_truncation_tooltip';

const CARD_INSET_PX = 12;
/** Vertical space from the header row (including quality badge overflow) to the stats row. */
const CARD_HEADER_STATS_SECTION_GAP_PX = 12;
/** Space between the icon tile and the title (design spec). */
const HEADER_ICON_TITLE_GAP_PX = 12;
/** Space between the truncated title and the Logs / Metrics badge cluster. */
const TITLE_TO_DATA_PRODUCT_BADGES_GAP_PX = 12;

export interface IngestHubDemoStreamsFlowSourceCardProps {
  readonly title: string;
  readonly metricsLine: string;
  /** When omitted, the card is treated as good quality. */
  readonly quality?: 'good' | 'degraded' | 'poor';
  readonly dataProduct: FlowCanvasDataProduct;
  readonly dimmed: boolean;
}

export function IngestHubDemoStreamsFlowSourceCard({
  title,
  metricsLine,
  quality,
  dataProduct,
  dimmed,
}: IngestHubDemoStreamsFlowSourceCardProps) {
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
      overflow: hidden;
      border: ${euiTheme.border.width.thin} solid ${cardBorderColor};
    `,
    [cardBorderColor, euiTheme.border.width.thin]
  );

  const cardBodyCss = useMemo(
    () => css`
      display: flex;
      flex-direction: column;
      gap: 0;
      min-width: 0;
      width: 100%;
    `,
    []
  );

  const statsRowMarginTopPx =
    CARD_HEADER_STATS_SECTION_GAP_PX + FLOW_CARD_QUALITY_BADGE_OVERFLOW_BELOW_ICON_TILE_PX;

  const statsTextCss = useMemo(
    () => css`
      ${euiFontSize(euiThemeContext, 'xxs')}
    `,
    [euiThemeContext]
  );

  return (
    <div
      style={{
        width: '100%',
        opacity: dimmed ? 0.38 : 1,
        transition: 'opacity 120ms ease',
      }}
    >
      <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none" color="plain" css={panelCss}>
        <div style={{ padding: CARD_INSET_PX }}>
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
                <IngestHubDemoStreamsFlowCardIconTile
                  iconType="logoAWS"
                  qualityStatus={resolvedQuality}
                />
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
                        <FlowCanvasTruncationTooltip tooltipContent={title}>
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
