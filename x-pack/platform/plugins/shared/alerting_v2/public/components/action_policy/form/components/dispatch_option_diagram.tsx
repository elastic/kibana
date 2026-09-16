/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  type EuiThemeComputed,
} from '@elastic/eui';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import type { GroupingMode, ThrottleStrategy } from '@kbn/alerting-v2-schemas';
import {
  alertTimelineStatusColor,
  alertTimelineStatusLabel,
} from '@kbn/alerting-v2-episodes-ui/alert_timeline';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';

interface DispatchOptionDiagramProps {
  groupingMode: GroupingMode;
  groupBy: string[];
  throttleStrategy: ThrottleStrategy;
  throttleInterval: string;
}

/** Diagram bar segments map to alert-series Active / Inactive colors. */
type SegmentKind = 'inactive' | 'active';

interface TimelineSegment {
  kind: SegmentKind;
  /** Flex grow weight */
  weight: number;
}

interface TimelineBolt {
  /** 0–1 position along the full bar */
  at: number;
}

interface TimelineRow {
  label?: string;
  segments: TimelineSegment[];
  bolts: TimelineBolt[];
}

interface DiagramModel {
  rows: TimelineRow[];
  labels?: Array<{ text: string; at: number }>;
}

const LEGEND_DATA_SENT = i18n.translate(
  'xpack.alertingV2.actionPolicy.form.dispatchDiagram.legend.dataSent',
  { defaultMessage: 'Data sent' }
);

const LABEL_OPENS = i18n.translate(
  'xpack.alertingV2.actionPolicy.form.dispatchDiagram.label.opens',
  { defaultMessage: 'Opens' }
);
const LABEL_ACTIVE = i18n.translate(
  'xpack.alertingV2.actionPolicy.form.dispatchDiagram.label.active',
  { defaultMessage: 'Active' }
);
const LABEL_RECOVERS = i18n.translate(
  'xpack.alertingV2.actionPolicy.form.dispatchDiagram.label.recovers',
  { defaultMessage: 'Recovers' }
);

const LEGEND_DOT_SIZE_PX = 10;
const BAR_HEIGHT_PX = 10;
/** Circle behind data-sent bolts — slightly taller than the bar. */
const BOLT_MARKER_SIZE_PX = 16;

const segmentStatus = (kind: SegmentKind) =>
  kind === 'active' ? ALERT_EPISODE_STATUS.ACTIVE : ALERT_EPISODE_STATUS.INACTIVE;

const buildDiagram = ({
  groupingMode,
  throttleStrategy,
}: DispatchOptionDiagramProps): DiagramModel => {
  const openAt = 0.22;
  const recoverAt = 0.78;
  const activeCenter = (openAt + recoverAt) / 2;

  if (groupingMode === 'per_episode') {
    const baseSegments: TimelineSegment[] = [
      { kind: 'inactive', weight: openAt },
      { kind: 'active', weight: recoverAt - openAt },
      { kind: 'inactive', weight: 1 - recoverAt },
    ];
    const edgeLabels = [
      { text: LABEL_OPENS, at: openAt },
      { text: LABEL_ACTIVE, at: activeCenter },
      { text: LABEL_RECOVERS, at: recoverAt },
    ];

    switch (throttleStrategy) {
      case 'on_status_change':
        return {
          rows: [
            {
              segments: baseSegments,
              bolts: [{ at: openAt }, { at: recoverAt }],
            },
          ],
          labels: edgeLabels,
        };
      case 'per_status_interval': {
        const midBolts = [0.35, 0.48, 0.61].map((at) => ({ at }));
        return {
          rows: [
            {
              segments: baseSegments,
              bolts: [{ at: openAt }, ...midBolts, { at: recoverAt }],
            },
          ],
          labels: edgeLabels,
        };
      }
      case 'every_time':
        return {
          rows: [
            {
              segments: baseSegments,
              bolts: [0.08, 0.22, 0.36, 0.5, 0.64, 0.78, 0.92].map((at) => ({ at })),
            },
          ],
          labels: edgeLabels,
        };
      default:
        break;
    }
  }

  if (groupingMode === 'per_field') {
    return {
      rows: [
        {
          label: 'group:A',
          segments: [
            { kind: 'inactive', weight: 0.12 },
            { kind: 'active', weight: 0.7 },
            { kind: 'inactive', weight: 0.18 },
          ],
          bolts:
            throttleStrategy === 'every_time'
              ? [0.2, 0.35, 0.5, 0.65, 0.78].map((at) => ({ at }))
              : [0.35, 0.55, 0.72].map((at) => ({ at })),
        },
        {
          label: 'group:B',
          segments: [
            { kind: 'inactive', weight: 0.28 },
            { kind: 'active', weight: 0.52 },
            { kind: 'inactive', weight: 0.2 },
          ],
          bolts:
            throttleStrategy === 'every_time'
              ? [0.35, 0.48, 0.6, 0.72].map((at) => ({ at }))
              : [0.45, 0.65].map((at) => ({ at })),
        },
        {
          label: 'group:C',
          segments: [
            { kind: 'inactive', weight: 0.42 },
            { kind: 'active', weight: 0.38 },
            { kind: 'inactive', weight: 0.2 },
          ],
          bolts:
            throttleStrategy === 'every_time'
              ? [0.5, 0.68].map((at) => ({ at }))
              : [{ at: 0.58 }],
        },
      ],
    };
  }

  // Digest all
  return {
    rows: [
      {
        label: i18n.translate(
          'xpack.alertingV2.actionPolicy.form.dispatchDiagram.digestRowLabel',
          { defaultMessage: 'all alerts' }
        ),
        segments: [
          { kind: 'inactive', weight: 0.15 },
          { kind: 'active', weight: 0.7 },
          { kind: 'inactive', weight: 0.15 },
        ],
        bolts:
          throttleStrategy === 'every_time'
            ? [0.22, 0.38, 0.54, 0.7].map((at) => ({ at }))
            : [0.4, 0.65].map((at) => ({ at })),
      },
    ],
  };
};

const LegendSwatch = ({ color }: { color: string }) => (
  <span
    css={css`
      display: inline-block;
      width: ${LEGEND_DOT_SIZE_PX}px;
      height: ${LEGEND_DOT_SIZE_PX}px;
      border-radius: 50%;
      background: ${color};
    `}
    aria-hidden
  />
);

const DataSentMarker = ({
  at,
  boltColor,
  background,
  borderColor,
}: {
  at: number;
  boltColor: string;
  background: string;
  borderColor: string;
}) => (
  <span
    css={css`
      position: absolute;
      left: ${at * 100}%;
      top: 50%;
      width: ${BOLT_MARKER_SIZE_PX}px;
      height: ${BOLT_MARKER_SIZE_PX}px;
      border-radius: 50%;
      background: ${background};
      border: 1px solid ${borderColor};
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: center;
      transform: translate(-50%, -50%);
      pointer-events: none;
      z-index: 1;
    `}
    aria-hidden
  >
    <EuiIcon type="bolt" size="s" color={boltColor} />
  </span>
);

const TimelineBar = ({
  row,
  euiTheme,
  boltColor,
}: {
  row: TimelineRow;
  euiTheme: EuiThemeComputed;
  boltColor: string;
}) => {
  const markerBackground = euiTheme.colors.emptyShade;
  const markerBorder = euiTheme.colors.borderBaseSubdued;

  return (
    <div
      css={css`
        position: relative;
        flex: 1;
        min-width: 0;
        height: ${euiTheme.size.l};
        display: flex;
        align-items: center;
      `}
    >
      <div
        css={css`
          display: flex;
          width: 100%;
          height: ${BAR_HEIGHT_PX}px;
          border-radius: ${BAR_HEIGHT_PX / 2}px;
          overflow: hidden;
        `}
      >
        {row.segments.map((segment, index) => (
          <div
            key={`${segment.kind}-${index}`}
            css={css`
              flex: ${segment.weight};
              background: ${alertTimelineStatusColor(euiTheme, segmentStatus(segment.kind))};
            `}
          />
        ))}
      </div>
      {row.bolts.map((bolt) => (
        <DataSentMarker
          key={`bolt-${bolt.at}`}
          at={bolt.at}
          boltColor={boltColor}
          background={markerBackground}
          borderColor={markerBorder}
        />
      ))}
    </div>
  );
};

export const DispatchOptionDiagram = ({
  groupingMode,
  groupBy,
  throttleStrategy,
  throttleInterval,
}: DispatchOptionDiagramProps) => {
  const { euiTheme } = useEuiTheme();
  const model = useMemo(
    () => buildDiagram({ groupingMode, groupBy, throttleStrategy, throttleInterval }),
    [groupingMode, groupBy, throttleStrategy, throttleInterval]
  );

  const inactiveColor = alertTimelineStatusColor(euiTheme, ALERT_EPISODE_STATUS.INACTIVE);
  const activeColor = alertTimelineStatusColor(euiTheme, ALERT_EPISODE_STATUS.ACTIVE);
  const boltColor = euiTheme.colors.textParagraph;
  const labelColor = euiTheme.colors.textSubdued;

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="m"
      data-test-subj="dispatchOptionDiagram"
      css={css`
        border-radius: ${euiTheme.border.radius.medium};
      `}
    >
      <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <LegendSwatch color={inactiveColor} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {alertTimelineStatusLabel(ALERT_EPISODE_STATUS.INACTIVE)}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <LegendSwatch color={activeColor} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {alertTimelineStatusLabel(ALERT_EPISODE_STATUS.ACTIVE)}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="bolt" size="s" color={boltColor} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {LEGEND_DATA_SENT}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <div
        css={css`
          display: flex;
          flex-direction: column;
          gap: ${euiTheme.size.s};
        `}
      >
        {model.rows.map((row, rowIndex) => (
          <EuiFlexGroup
            key={row.label ?? `row-${rowIndex}`}
            gutterSize="s"
            alignItems="center"
            responsive={false}
          >
            {row.label != null && (
              <EuiFlexItem
                grow={false}
                css={css`
                  width: ${euiTheme.size.xxl};
                  min-width: 4.5rem;
                `}
              >
                <EuiText size="xs" color="subdued">
                  <code>{row.label}</code>
                </EuiText>
              </EuiFlexItem>
            )}
            <EuiFlexItem>
              <TimelineBar row={row} euiTheme={euiTheme} boltColor={boltColor} />
            </EuiFlexItem>
          </EuiFlexGroup>
        ))}
      </div>

      {model.labels != null && model.labels.length > 0 && (
        <>
          <EuiSpacer size="xs" />
          <div
            css={css`
              position: relative;
              height: ${euiTheme.size.base};
            `}
          >
            {model.labels.map((label) => (
              <EuiText
                key={label.text}
                size="xs"
                css={css`
                  position: absolute;
                  left: ${label.at * 100}%;
                  transform: translateX(-50%);
                  color: ${labelColor};
                  white-space: nowrap;
                `}
              >
                {label.text}
              </EuiText>
            ))}
          </div>
        </>
      )}
    </EuiPanel>
  );
};
