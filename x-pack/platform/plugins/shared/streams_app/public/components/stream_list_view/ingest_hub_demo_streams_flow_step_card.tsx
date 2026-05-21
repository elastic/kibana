/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CSSProperties } from 'react';
import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiTitle,
  EuiToolTip,
  euiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { IngestHubDemoStreamsFlowCardIconTile } from './ingest_hub_demo_streams_flow_card_icon_tile';
import {
  INGEST_HUB_DEMO_STREAMS_FLOW_CARD_HEADER_TO_STATS_GAP_PX,
  ingestHubDemoStreamsFlowCardBodyCss,
  ingestHubDemoStreamsFlowCardPanelInsetStyle,
} from './ingest_hub_demo_streams_flow_card_layout';
import { ingestHubDemoStreamsFlowCardShellStyle } from './ingest_hub_demo_streams_flow_card_shell_styles';
import { FlowCanvasTruncationTooltip } from './ingest_hub_demo_streams_flow_truncation_tooltip';
const HEADER_ICON_TITLE_GAP_PX = 12;
const TITLE_TO_KIND_BADGE_GAP_PX = 12;

export type StreamFlowStepKind = 'processing' | 'routing';

export interface IngestHubDemoStreamsFlowStepCardProps {
  readonly kind: StreamFlowStepKind;
  readonly label: string;
  readonly detailLine: string;
  readonly dimmed: boolean;
}

function stepKindIconType(kind: StreamFlowStepKind): 'gear' | 'branch' {
  return kind === 'processing' ? 'gear' : 'branch';
}

function stepKindBadgeLabel(kind: StreamFlowStepKind): string {
  return kind === 'processing'
    ? i18n.translate('xpack.streams.ingestHubFlowCanvas.stepKind.processing', {
        defaultMessage: 'Pipeline',
      })
    : i18n.translate('xpack.streams.ingestHubFlowCanvas.stepKind.routing', {
        defaultMessage: 'Routing',
      });
}

export function IngestHubDemoStreamsFlowStepCard({
  kind,
  label,
  detailLine,
  dimmed,
}: IngestHubDemoStreamsFlowStepCardProps) {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;

  const rowEllipsis: CSSProperties = {
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    margin: 0,
  };

  const panelCss = useMemo(
    () => css`
      border-radius: 6px;
      width: 100%;
      min-width: 0;
      height: 100%;
      box-sizing: border-box;
      overflow: hidden;
      border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain};
      background: ${euiTheme.colors.backgroundBasePlain};
    `,
    [euiTheme]
  );

  const cardBodyCss = useMemo(() => css(ingestHubDemoStreamsFlowCardBodyCss), []);

  const kindBadgeTextCss = useMemo(
    () => css`
      ${euiFontSize(euiThemeContext, 'xxs')}
    `,
    [euiThemeContext]
  );

  const detailTextCss = useMemo(
    () => css`
      ${euiFontSize(euiThemeContext, 'xxs')}
      font-family: ${euiTheme.font.familyCode};
    `,
    [euiTheme.font.familyCode, euiThemeContext]
  );

  const kindBadgeLabel = stepKindBadgeLabel(kind);
  const kindBadgeTip = i18n.translate('xpack.streams.ingestHubFlowCanvas.stepKindBadgeTooltip', {
    defaultMessage: '{kind} step',
    values: { kind: kindBadgeLabel },
  });

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
                <IngestHubDemoStreamsFlowCardIconTile iconType={stepKindIconType(kind)} />
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
                        <FlowCanvasTruncationTooltip tooltipContent={label}>
                          {label}
                        </FlowCanvasTruncationTooltip>
                      </span>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem
                    grow={false}
                    css={css`
                      flex-shrink: 0;
                      padding-inline-start: ${TITLE_TO_KIND_BADGE_GAP_PX}px;
                    `}
                  >
                    <EuiToolTip content={kindBadgeTip} position="top" delay="regular">
                      <EuiBadge color="hollow" css={kindBadgeTextCss}>
                        {kindBadgeLabel}
                      </EuiBadge>
                    </EuiToolTip>
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
              css={detailTextCss}
              style={{
                ...rowEllipsis,
                marginTop: INGEST_HUB_DEMO_STREAMS_FLOW_CARD_HEADER_TO_STATS_GAP_PX,
                marginBottom: 0,
              }}
            >
              <FlowCanvasTruncationTooltip tooltipContent={detailLine}>
                {detailLine}
              </FlowCanvasTruncationTooltip>
            </EuiText>
          </div>
        </div>
      </EuiPanel>
    </div>
  );
}
