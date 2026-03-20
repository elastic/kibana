/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Axis,
  BarSeries,
  Chart,
  LIGHT_THEME,
  DARK_THEME,
  ScaleType,
  Settings,
  timeFormatter,
} from '@elastic/charts';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconTip,
  EuiPanel,
  EuiProgress,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { AssetImage } from '../asset_image';
import {
  SignificantEventDetailFlyout,
  type SignificantEvent,
} from './significant_event_detail_flyout';

// ─── Mock data ───────────────────────────────────────────────────────────────

// Generate mock histogram data — roughly 20 buckets from 10:00 to 20:00
const START_MS = new Date('2023-05-15T10:00:00').getTime();
const BUCKET_MS = 30 * 60 * 1000; // 30 minutes

const HISTOGRAM_DATA = Array.from({ length: 20 }, (_, i) => ({
  x: START_MS + i * BUCKET_MS,
  critical: Math.floor(5 + Math.random() * 8),
  medium: Math.floor(8 + Math.random() * 10),
  low: Math.floor(10 + Math.random() * 15),
}));

// Flatten into @elastic/charts datum format
const criticalData = HISTOGRAM_DATA.map((d) => ({ x: d.x, y: d.critical }));
const mediumData = HISTOGRAM_DATA.map((d) => ({ x: d.x, y: d.medium }));
const lowData = HISTOGRAM_DATA.map((d) => ({ x: d.x, y: d.low }));

const MOCK_EVENTS: SignificantEvent[] = [
  {
    id: '1',
    title: 'Fleet Server Dependency Chain - Single Point of Failure',
    severity: 'critical',
    condition: [
      { text: 'The ' },
      { text: 'Linux', badge: true },
      { text: ' server logs reveal persistent errors with the ' },
      { text: 'FileSystem', badge: true },
      { text: ', which causes significant disk I/O on multiple servers.' },
    ],
    status: 'Ongoing',
    timestamp: '20 minutes ago',
  },
  {
    id: '2',
    title: 'User Authentication Delay',
    severity: 'medium',
    condition: [
      { text: 'The ' },
      { text: 'iOS', badge: true },
      {
        text: ' app experienced intermittent login issues due to server overload, which has now been mitigated. ',
      },
      { text: 'User Feedback', badge: true },
      { text: ' was positive post-fix.' },
    ],
    status: 'Ongoing',
    timestamp: '4 minutes ago',
  },
  {
    id: '3',
    title: 'Data Synchronization Lag',
    severity: 'low',
    condition: [
      { text: 'The ' },
      { text: 'Web', badge: true },
      {
        text: ' application is currently facing slow data sync, originating from backend service scaling challenges. ',
      },
      { text: 'User Notifications', badge: true },
      { text: ' are in place.' },
    ],
    status: 'Ongoing',
    timestamp: '4 minutes ago',
  },
  {
    id: '4',
    title: 'API Rate Limiting Issues',
    severity: 'critical',
    condition: [
      { text: 'The ' },
      { text: 'Backend', badge: true },
      { text: ' service is hitting rate limits during peak hours, affecting API responsiveness. ' },
      { text: 'Team is optimizing', badge: true },
      { text: ' request handling.' },
    ],
    status: 'Ongoing',
    timestamp: '4 minutes ago',
  },
];

// Figma specifies: Critical → accent (pink), Medium → warning (yellow), Low → success (teal)
const SEVERITY_BADGE_COLOR: Record<SignificantEvent['severity'], string> = {
  critical: 'accent',
  medium: 'warning',
  low: 'success',
};

const SEVERITY_LABEL: Record<SignificantEvent['severity'], string> = {
  critical: 'Critical',
  medium: 'Medium',
  low: 'Low',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * 1px × 46px vertical rule with 8px horizontal padding on each side,
 * matching the Figma rotated-line separator between stats.
 */
function StatDivider() {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        display: flex;
        align-items: center;
        align-self: stretch;
        padding: 0 8px;
        flex-shrink: 0;
      `}
    >
      <div
        css={css`
          width: 1px;
          height: 46px;
          background: ${euiTheme.colors.borderBaseSubdued};
        `}
      />
    </div>
  );
}

/**
 * Mini inline bar chart for the "Events" stat.
 * Bar heights and color (#54b399) taken directly from the Figma node.
 */
function MiniChart() {
  // Exact pixel heights from Figma node 316:93992–316:94014
  const heights = [
    2, 2, 2, 3, 3, 3, 3, 16, 3, 3, 12, 12, 5, 26, 26, 32, 26, 26, 32, 26, 30, 34, 34,
  ];
  return (
    <div
      css={css`
        display: flex;
        align-items: flex-end;
        gap: 1px;
        height: 34px;
        flex: 1 0 0;
        min-width: 0;
      `}
    >
      {heights.map((h, i) => (
        <div
          key={i}
          css={css`
            flex: 1 0 0;
            height: ${h}px;
            background: #54b399;
          `}
        />
      ))}
    </div>
  );
}

interface StatBlockProps {
  value: string;
  label: string;
  /** Dot indicator shown left of the value */
  showDot?: boolean;
  /** iInCircle info tooltip shown right of the value */
  showInfo?: boolean;
}

/**
 * A single stat block: value row (dot? + number + info?) on top,
 * label row on bottom. Matches Figma "Stat" frame.
 */
function StatBlock({ value, label, showDot, showInfo }: StatBlockProps) {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        flex: 1 0 0;
        min-width: 0;
      `}
    >
      {/* Top row: [dot] + value (24px SemiBold) + [info icon] */}
      <div
        css={css`
          display: flex;
          align-items: center;
        `}
      >
        {showDot && (
          <span
            css={css`
              display: inline-block;
              width: 8px;
              height: 8px;
              border-radius: 50%;
              background: ${euiTheme.colors.vis.euiColorVisDanger0};
              flex-shrink: 0;
              margin-right: 4px;
            `}
          />
        )}
        <span
          css={css`
            font-family: ${euiTheme.font.family};
            font-size: 24px;
            font-weight: ${euiTheme.font.weight.semiBold};
            line-height: 28px;
            color: ${euiTheme.colors.textHeading};
            white-space: nowrap;
          `}
        >
          {value}
        </span>
        {showInfo && (
          <EuiIconTip
            type="info"
            size="s"
            color="subdued"
            content={label}
            css={css`
              margin-left: 4px;
              flex-shrink: 0;
            `}
          />
        )}
      </div>

      {/* Bottom row: label */}
      <span
        css={css`
          font-family: ${euiTheme.font.family};
          font-size: 14px;
          font-weight: ${euiTheme.font.weight.regular};
          line-height: 20px;
          color: ${euiTheme.colors.textParagraph};
          white-space: nowrap;
        `}
      >
        {label}
      </span>
    </div>
  );
}

function EventRow({
  event,
  onExpand,
}: {
  event: SignificantEvent;
  onExpand: (event: SignificantEvent) => void;
}) {
  const { euiTheme } = useEuiTheme();

  return (
    <div>
      {/*
       * Row: flex items-center, all cells vertically centered.
       * Widths match Figma: expand=32px, main=flex-1, badges=170px,
       * timestamp=141px, actions=163px.
       */}
      <div
        css={css`
          display: flex;
          align-items: center;
          width: 100%;
        `}
      >
        {/* ── Expand icon — 32px wide, centered, no extra padding ── */}
        <div
          css={css`
            width: 32px;
            margin-left: 8px;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            align-self: stretch;
          `}
        >
          <EuiButtonIcon
            iconType="expand"
            size="xs"
            color="text"
            onClick={() => onExpand(event)}
            aria-label={i18n.translate('xpack.streams.significantEvents.detectedView.expandEvent', {
              defaultMessage: 'View event details',
            })}
          />
        </div>

        {/* ── Main cell — grows, flex-col, gap:8px, p:8px ── */}
        <div
          css={css`
            flex: 1 0 0;
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 8px;
            padding: 16px 8px;
            overflow: hidden;
          `}
        >
          {/*
           * Title: Inter Medium 14px, link blue #1750ba,
           * single line h:21px with text-ellipsis overflow.
           */}
          <div
            css={css`
              height: 21px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              font-family: ${euiTheme.font.family};
              font-size: 14px;
              font-weight: ${euiTheme.font.weight.medium};
              line-height: 20px;
              color: ${euiTheme.colors.textPrimary};
              cursor: pointer;

              &:hover {
                text-decoration: underline;
              }
            `}
          >
            {event.title}
          </div>

          {/*
           * Condition panel: bg-subdued, border-radius:8px, px:8px py:4px.
           * Content: flex-wrap with gap:2px between each segment/badge.
           * Text: 12px regular, #1d2a3e.
           */}
          <div
            css={css`
              background: ${euiTheme.colors.backgroundBaseSubdued};
              border-radius: 8px;
              padding: 4px 8px;
              min-height: 28px;
              display: flex;
              flex-wrap: wrap;
              align-items: center;
              gap: 2px;
            `}
          >
            {event.condition.map((seg, i) =>
              seg.badge ? (
                <EuiBadge key={i} color="hollow">
                  {seg.text}
                </EuiBadge>
              ) : (
                <span
                  key={i}
                  css={css`
                    font-family: ${euiTheme.font.family};
                    font-size: 12px;
                    font-weight: ${euiTheme.font.weight.regular};
                    line-height: 16px;
                    color: ${euiTheme.colors.textParagraph};
                    white-space: nowrap;
                  `}
                >
                  {seg.text}
                </span>
              )
            )}
          </div>
        </div>

        {/* ── Severity + Status badges — w:170px px:10px gap:11px ── */}
        <div
          css={css`
            width: 170px;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            gap: 11px;
            padding: 0 10px;
            align-self: stretch;
          `}
        >
          <EuiBadge color={SEVERITY_BADGE_COLOR[event.severity]}>
            {SEVERITY_LABEL[event.severity]}
          </EuiBadge>
          <EuiBadge color="hollow">{event.status}</EuiBadge>
        </div>

        {/* ── Timestamp — w:141px px:8px, 14px Regular line-height:24px ── */}
        <div
          css={css`
            width: 141px;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            align-self: stretch;
            padding: 0 8px;
          `}
        >
          <span
            css={css`
              font-family: ${euiTheme.font.family};
              font-size: 14px;
              font-weight: ${euiTheme.font.weight.regular};
              line-height: 24px;
              color: ${euiTheme.colors.textParagraph};
              white-space: nowrap;
            `}
          >
            {event.timestamp}
          </span>
        </div>

        {/* ── Actions — px:12px py:8px, gap:8px, no fixed width ── */}
        <div
          css={css`
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            align-self: stretch;
            gap: 8px;
            padding: 8px 12px;
          `}
        >
          {/*
           * "Start a chat": EuiButtonEmpty xs primary with productAgent icon.
           * white-space: nowrap prevents the label from wrapping.
           */}
          <EuiButtonEmpty
            size="xs"
            iconType="productAgent"
            iconSide="left"
            color="primary"
            css={css`
              white-space: nowrap;
            `}
          >
            {i18n.translate('xpack.streams.significantEvents.detectedView.startChat', {
              defaultMessage: 'Start a chat',
            })}
          </EuiButtonEmpty>
          <EuiButtonIcon
            iconType="boxesVertical"
            size="xs"
            display="empty"
            color="primary"
            aria-label={i18n.translate('xpack.streams.significantEvents.detectedView.moreActions', {
              defaultMessage: 'More actions',
            })}
          />
        </div>
      </div>

      {/* Divider — Figma: bg-[#d3dae6] h-px (Core/lightShade) */}
      <div
        css={css`
          height: 1px;
          background: ${euiTheme.colors.borderBaseSubdued};
          width: 100%;
        `}
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SignificantEventsDetectedView({ isLoading = false }: { isLoading?: boolean }) {
  const { euiTheme, colorMode } = useEuiTheme();
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(true);
  const [isHistogramOpen, setIsHistogramOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SignificantEvent | null>(null);

  const chartTheme = colorMode === 'DARK' ? DARK_THEME : LIGHT_THEME;

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow-y: auto;
      `}
    >
      {/* Content area with padding — summary panel lives here so it inherits the inset */}
      <div
        css={css`
          display: flex;
          flex-direction: column;
          gap: ${euiTheme.size.base};
          padding: ${euiTheme.size.base} ${euiTheme.size.l};
          flex: 1;
        `}
      >
        {/* ── Search + filter + timepicker bar — always at the top ── */}
        <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
          {/* Search field */}
          <EuiFlexItem>
            <EuiFieldSearch
              placeholder={i18n.translate(
                'xpack.streams.significantEvents.detectedView.searchPlaceholder',
                { defaultMessage: 'Significant event, query name ...' }
              )}
              fullWidth
              compressed={false}
            />
          </EuiFlexItem>

          {/* Severity + Status filters */}
          <EuiFlexItem grow={false}>
            <EuiFilterGroup>
              <EuiFilterButton hasActiveFilters={false} iconType="arrowDown" iconSide="right">
                {i18n.translate('xpack.streams.significantEvents.detectedView.severityFilter', {
                  defaultMessage: 'Severity',
                })}
              </EuiFilterButton>
              <EuiFilterButton hasActiveFilters={false} iconType="arrowDown" iconSide="right">
                {i18n.translate('xpack.streams.significantEvents.detectedView.statusFilter', {
                  defaultMessage: 'Status',
                })}
              </EuiFilterButton>
            </EuiFilterGroup>
          </EuiFlexItem>

          {/* Timepicker group — calendar icon | "Last 15 minutes" | refresh */}
          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              gutterSize="none"
              alignItems="center"
              responsive={false}
              css={css`
                border: 1px solid ${euiTheme.colors.borderBasePlain};
                border-radius: ${euiTheme.border.radius.medium};
                overflow: hidden;
              `}
            >
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="calendar"
                  color="text"
                  size="m"
                  aria-label={i18n.translate(
                    'xpack.streams.significantEvents.detectedView.calendarButton',
                    { defaultMessage: 'Select date range' }
                  )}
                  css={css`
                    border-radius: 0;
                    border-right: 1px solid ${euiTheme.colors.borderBasePlain};
                  `}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="s"
                  iconType="arrowDown"
                  iconSide="right"
                  color="text"
                  css={css`
                    font-size: ${euiTheme.size.m};
                    white-space: nowrap;
                    border-radius: 0;
                    padding-inline: ${euiTheme.size.s};
                  `}
                >
                  {i18n.translate(
                    'xpack.streams.significantEvents.detectedView.timeRangeLabel',
                    { defaultMessage: 'Last 15 minutes' }
                  )}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="refresh"
                  color="text"
                  size="m"
                  aria-label={i18n.translate(
                    'xpack.streams.significantEvents.detectedView.refreshButton',
                    { defaultMessage: 'Refresh' }
                  )}
                  css={css`
                    border-radius: 0;
                    border-left: 1px solid ${euiTheme.colors.borderBasePlain};
                  `}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>

        {/*
         * Summary stats panel — matches Figma node 312:91439.
         * Outer card: white bg, border #e3e8f2, border-radius 6px, padding 16px.
         * Header: arrow toggle + "Summary" label.
         * Body: two inner bordered cards side-by-side.
         */}
        <EuiPanel hasBorder hasShadow={false} paddingSize="m">
          {/* Collapsible header — no separator, gap 16px */}
          <button
            type="button"
            onClick={() => setIsSummaryExpanded((v) => !v)}
            css={css`
              display: flex;
              align-items: center;
              gap: ${euiTheme.size.base};
              width: 100%;
              background: none;
              border: none;
              padding: 0;
              cursor: pointer;
              margin-bottom: ${isSummaryExpanded ? euiTheme.size.base : '0'};
            `}
          >
            <EuiIcon type={isSummaryExpanded ? 'arrowDown' : 'arrowRight'} size="s" aria-hidden />
            <span
              css={css`
                font-family: ${euiTheme.font.family};
                font-size: 14px;
                font-weight: ${euiTheme.font.weight.semiBold};
                line-height: 20px;
                color: ${euiTheme.colors.textHeading};
              `}
            >
              {i18n.translate('xpack.streams.significantEvents.detectedView.summary', {
                defaultMessage: 'Summary',
              })}
            </span>
          </button>

          {isSummaryExpanded && (
            <div
              css={css`
                display: flex;
                gap: ${euiTheme.size.base};
                align-items: stretch;
              `}
            >
              {/*
               * Card 1 (flex-1): three stats with vertical dividers.
               * bg-white, border, border-radius 6px, padding 20px.
               */}
              <div
                css={css`
                  flex: 1 0 0;
                  min-width: 0;
                  display: flex;
                  align-items: center;
                  gap: 0;
                  padding: 20px;
                  border: 1px solid ${euiTheme.colors.borderBaseSubdued};
                  border-radius: 6px;
                  background: ${euiTheme.colors.backgroundBasePlain};
                `}
              >
                {/* Stat 1: Ongoing Significant events — no dot, info icon */}
                <StatBlock
                  value={isLoading ? '–' : '4'}
                  label={i18n.translate(
                    'xpack.streams.significantEvents.detectedView.ongoingEvents',
                    { defaultMessage: 'Ongoing Significant events' }
                  )}
                  showInfo
                />

                <StatDivider />

                {/* Stat 2: Knowledge Indicators — dot, info icon */}
                <StatBlock
                  value="4,230"
                  label={i18n.translate(
                    'xpack.streams.significantEvents.detectedView.knowledgeIndicators',
                    { defaultMessage: 'Knowledge Indicators' }
                  )}
                  showDot
                  showInfo
                />

                <StatDivider />

                {/* Stat 3: Rules — dot, info icon */}
                <StatBlock
                  value="58"
                  label={i18n.translate('xpack.streams.significantEvents.detectedView.rules', {
                    defaultMessage: 'Rules',
                  })}
                  showDot
                  showInfo
                />

                <StatDivider />

                {/*
                 * Stat 4: Events — dot, info icon, mini chart as flex sibling.
                 * The outer wrapper is flex row so MiniChart sits beside the stat.
                 */}
                <div
                  css={css`
                    flex: 1 0 0;
                    min-width: 0;
                    display: flex;
                    align-items: center;
                    gap: ${euiTheme.size.s};
                  `}
                >
                  <StatBlock
                    value={isLoading ? '–' : '4,432'}
                    label={i18n.translate('xpack.streams.significantEvents.detectedView.events', {
                      defaultMessage: 'Events',
                    })}
                    showDot={!isLoading}
                    showInfo
                  />
                  {isLoading ? (
                    <EuiText size="xs" color="subdued">
                      <span>
                        {i18n.translate(
                          'xpack.streams.significantEvents.detectedView.noEventsYet',
                          { defaultMessage: 'No events yet' }
                        )}
                      </span>
                    </EuiText>
                  ) : (
                    <MiniChart />
                  )}
                </div>
              </div>

              {/*
               * Card 2 (fixed 184px): Streams analyzed — no dot, no info, no action.
               */}
              <div
                css={css`
                  width: 184px;
                  flex-shrink: 0;
                  align-self: stretch;
                  display: flex;
                  align-items: center;
                  padding: 20px;
                  border: 1px solid ${euiTheme.colors.borderBaseSubdued};
                  border-radius: 6px;
                `}
              >
                <StatBlock
                  value="13/23"
                  label={i18n.translate(
                    'xpack.streams.significantEvents.detectedView.streamsAnalyzed',
                    { defaultMessage: 'Streams analyzed' }
                  )}
                />
              </div>
            </div>
          )}
        </EuiPanel>
        {/* Histogram — collapsible, closed by default, always rendered for consistent spacing */}
        <EuiPanel hasBorder hasShadow={false} paddingSize="m">
          <button
            type="button"
            onClick={() => setIsHistogramOpen((v) => !v)}
            css={css`
              display: flex;
              align-items: center;
              gap: ${euiTheme.size.base};
              width: 100%;
              background: none;
              border: none;
              padding: 0;
              cursor: pointer;
            `}
          >
            <EuiIcon type={isHistogramOpen ? 'arrowDown' : 'arrowRight'} size="s" aria-hidden />
            <span
              css={css`
                font-family: ${euiTheme.font.family};
                font-size: 14px;
                font-weight: ${euiTheme.font.weight.semiBold};
                line-height: 20px;
                color: ${euiTheme.colors.textHeading};
              `}
            >
              {i18n.translate('xpack.streams.significantEvents.detectedView.histogram', {
                defaultMessage: 'Histogram',
              })}
            </span>
          </button>

          {isHistogramOpen && !isLoading && (
            <div
              css={css`
                margin-top: ${euiTheme.size.base};
              `}
            >
              {/* Toolbar */}
              <div
                css={css`
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  border-bottom: 1px solid ${euiTheme.colors.borderBaseSubdued};
                  padding-bottom: ${euiTheme.size.s};
                  margin-bottom: ${euiTheme.size.s};
                `}
              >
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      iconType="calendar"
                      size="s"
                      color="text"
                      aria-label={i18n.translate(
                        'xpack.streams.significantEvents.detectedView.timeRange',
                        { defaultMessage: 'Time range' }
                      )}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty size="s" iconType="arrowDown" iconSide="right">
                      {i18n.translate(
                        'xpack.streams.significantEvents.detectedView.breakdownBySeverity',
                        { defaultMessage: 'Breakdown by severity' }
                      )}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      iconType="pencil"
                      size="s"
                      color="text"
                      aria-label={i18n.translate(
                        'xpack.streams.significantEvents.detectedView.editChart',
                        { defaultMessage: 'Edit chart' }
                      )}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      iconType="save"
                      size="s"
                      color="text"
                      aria-label={i18n.translate(
                        'xpack.streams.significantEvents.detectedView.saveChart',
                        { defaultMessage: 'Save chart' }
                      )}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </div>

              {/* Chart + Legend */}
              <div
                css={css`
                  display: flex;
                  gap: ${euiTheme.size.base};
                  height: 192px;
                `}
              >
                <div
                  css={css`
                    flex: 1;
                    min-width: 0;
                  `}
                >
                  <Chart>
                    <Settings
                      baseTheme={chartTheme}
                      showLegend={false}
                      theme={{
                        chartMargins: { top: 4, bottom: 4, left: 0, right: 0 },
                        chartPaddings: { top: 0, bottom: 0, left: 0, right: 0 },
                      }}
                    />
                    <Axis
                      id="time"
                      position="bottom"
                      tickFormat={timeFormatter('HH:mm')}
                      style={{
                        tickLabel: { fontSize: 11, fill: euiTheme.colors.textSubdued },
                        axisLine: { visible: false },
                        tickLine: { visible: false },
                      }}
                    />
                    <Axis
                      id="count"
                      position="left"
                      style={{
                        tickLabel: { fontSize: 11, fill: euiTheme.colors.textSubdued },
                        axisLine: { visible: false },
                        tickLine: { visible: false },
                      }}
                      ticks={4}
                    />
                    <BarSeries
                      id="low"
                      name={i18n.translate(
                        'xpack.streams.significantEvents.detectedView.legend.low',
                        { defaultMessage: 'Low' }
                      )}
                      xScaleType={ScaleType.Time}
                      yScaleType={ScaleType.Linear}
                      xAccessor="x"
                      yAccessors={['y']}
                      stackAccessors={['x']}
                      data={lowData}
                      color={euiTheme.colors.vis.euiColorVisSuccess0}
                      timeZone="local"
                    />
                    <BarSeries
                      id="medium"
                      name={i18n.translate(
                        'xpack.streams.significantEvents.detectedView.legend.medium',
                        { defaultMessage: 'Medium' }
                      )}
                      xScaleType={ScaleType.Time}
                      yScaleType={ScaleType.Linear}
                      xAccessor="x"
                      yAccessors={['y']}
                      stackAccessors={['x']}
                      data={mediumData}
                      color={euiTheme.colors.vis.euiColorVisWarning0}
                      timeZone="local"
                    />
                    <BarSeries
                      id="critical"
                      name={i18n.translate(
                        'xpack.streams.significantEvents.detectedView.legend.critical',
                        { defaultMessage: 'Critical' }
                      )}
                      xScaleType={ScaleType.Time}
                      yScaleType={ScaleType.Linear}
                      xAccessor="x"
                      yAccessors={['y']}
                      stackAccessors={['x']}
                      data={criticalData}
                      color={euiTheme.colors.vis.euiColorVisDanger0}
                      timeZone="local"
                    />
                  </Chart>
                </div>

                {/* Legend */}
                <div
                  css={css`
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    gap: ${euiTheme.size.m};
                    min-width: 80px;
                  `}
                >
                  {[
                    {
                      label: i18n.translate(
                        'xpack.streams.significantEvents.detectedView.legend.critical',
                        { defaultMessage: 'Critical' }
                      ),
                      color: euiTheme.colors.vis.euiColorVisDanger0,
                    },
                    {
                      label: i18n.translate(
                        'xpack.streams.significantEvents.detectedView.legend.medium',
                        { defaultMessage: 'Medium' }
                      ),
                      color: euiTheme.colors.vis.euiColorVisWarning0,
                    },
                    {
                      label: i18n.translate(
                        'xpack.streams.significantEvents.detectedView.legend.low',
                        { defaultMessage: 'Low' }
                      ),
                      color: euiTheme.colors.vis.euiColorVisSuccess0,
                    },
                  ].map(({ label, color }) => (
                    <div
                      key={label}
                      css={css`
                        display: flex;
                        align-items: center;
                        gap: ${euiTheme.size.xs};
                      `}
                    >
                      <span
                        css={css`
                          display: inline-block;
                          width: 8px;
                          height: 8px;
                          border-radius: 50%;
                          background: ${color};
                          flex-shrink: 0;
                        `}
                      />
                      <EuiText size="xs">
                        <span>{label}</span>
                      </EuiText>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </EuiPanel>

        {/* Table header row — always rendered so spacing is identical between loading and loaded */}
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            {!isLoading && (
              <EuiText size="s" color="subdued">
                <span>
                  {i18n.translate('xpack.streams.significantEvents.detectedView.showing', {
                    defaultMessage: 'Showing 1–4 of 4 Significant events',
                  })}
                </span>
              </EuiText>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty size="s" iconType="arrowDown" iconSide="right">
              {i18n.translate('xpack.streams.significantEvents.detectedView.generateNew', {
                defaultMessage: 'Generate new',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>

        {/* Event rows — progress bar + empty state when loading, real rows when data is available */}
        <EuiPanel
          hasBorder
          hasShadow={false}
          paddingSize="none"
          css={css`
            position: relative;
          `}
        >
          {isLoading && <EuiProgress size="xs" color="accent" position="absolute" />}
          {isLoading ? (
            <div
              css={css`
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: ${euiTheme.size.l};
                padding: ${euiTheme.size.xxl} ${euiTheme.size.l};
                min-height: 340px;
              `}
            >
              <AssetImage type="significantEventsDiscovering" size={160} />
              <div
                css={css`
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  gap: ${euiTheme.size.s};
                  text-align: center;
                  max-width: 400px;
                `}
              >
                <EuiTitle size="xs">
                  <h3>
                    {i18n.translate('xpack.streams.significantEvents.detectedView.noEventsTitle', {
                      defaultMessage: 'Currently no significant events discovered',
                    })}
                  </h3>
                </EuiTitle>
                <EuiText size="s" color="subdued">
                  <p>
                    {i18n.translate(
                      'xpack.streams.significantEvents.detectedView.noEventsDescription',
                      {
                        defaultMessage:
                          'We are listening for events, and correlating your results. Once something is discovered it will appear here.',
                      }
                    )}
                  </p>
                </EuiText>
              </div>
              <EuiButton size="s" isDisabled isLoading>
                {i18n.translate('xpack.streams.significantEvents.detectedView.discoveringButton', {
                  defaultMessage: 'Discovering ...',
                })}
              </EuiButton>
            </div>
          ) : (
            <>
              {/* Skeleton rows give a table-loading feel before rows appear */}
              {MOCK_EVENTS.map((event) => (
                <EventRow key={event.id} event={event} onExpand={setSelectedEvent} />
              ))}
            </>
          )}
        </EuiPanel>
      </div>

      {/* Detail flyout — opens when an event's expand icon is clicked */}
      {selectedEvent && (
        <SignificantEventDetailFlyout
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}
