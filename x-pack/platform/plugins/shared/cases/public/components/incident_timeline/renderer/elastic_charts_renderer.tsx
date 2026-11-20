/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';
import type {
  AnnotationClickListener,
  BrushEndListener,
  CustomTooltip,
  ElementClickListener,
  PartialTheme,
  PointStyleAccessor,
  Theme,
  XYChartElementEvent,
} from '@elastic/charts';
import {
  Axis,
  Chart,
  LineSeries,
  Position,
  RectAnnotation,
  ScaleType,
  Settings,
  Tooltip,
  TooltipContainer,
  TooltipHeader,
  TooltipMetricRow,
  TooltipType,
} from '@elastic/charts';
import type { EuiThemeComputed } from '@elastic/eui';
import {
  EuiBadge,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiText,
  EuiTextBlockTruncate,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useResizeObserver,
} from '@elastic/eui';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { i18n as kbnI18n } from '@kbn/i18n';
import { CaseStatuses } from '../../../../common/types/domain';
import type { IncidentTimelineAlert } from '../../../../common/types/api';
import { statuses } from '../../status/config';
import type {
  AlertCell,
  AlertRow,
  AlertRowRendering,
  CaseMarkerGroup,
  CaseMarkerKind,
  CaseSpan,
  EntryLabelLayout,
  EntryRow,
  TimeWindow,
  TimelineEntry,
} from '../model';
import {
  ENTRY_FLAG_PX,
  TIMELINE_DENSITY,
  groupCaseMarkers,
  layoutEntryLabels,
  renderAlertRow,
} from '../model';
import type { TimeFormat } from '../format';
import { formatDuration, formatRange, formatTime, useTimeFormat } from '../format';
import * as i18n from '../translations';
import type { TimelineRendererProps } from './types';

const LABEL_WIDTH = 300;
const CASE_ROW_HEIGHT = 40;
const ENTRY_ROW_HEIGHT = 40;
const ALERT_ROW_HEIGHT = 24;
/** Two layers of tick labels, plus a strip above them to brush on. */
const AXIS_HEIGHT = 56;
const MIN_CELL_LABEL_PX = 14;
const ENTRY_LEVEL_PX = 20;
/** Space at the top of the case and entry rows for their markers. */
const MARKER_ROOM_PX = 14;
const ALERT_POINT_RADIUS_PX = 4;

/** The shared crosshair over all lanes replaces each row chart's own cursor. */
const ROW_THEME: PartialTheme = {
  chartMargins: { top: 0, bottom: 0, left: 0, right: 0 },
  chartPaddings: { top: 0, bottom: 0, left: 0, right: 0 },
  crosshair: {
    band: { visible: false },
    line: { visible: false },
    crossLine: { visible: false },
  },
};

const MARKER_ICONS: Record<CaseMarkerKind, string> = {
  created: 'plusInCircle',
  in_progress: 'folderExclamation',
  opened: 'folderOpen',
  closed: 'folderCheck',
  reopened: 'refresh',
};

interface AlertPointDatum {
  x: number;
  y: number;
  alert: IncidentTimelineAlert;
}

const severityColor = (euiTheme: EuiThemeComputed, severity?: string): string => {
  const { severity: colors } = euiTheme.colors;
  switch (severity) {
    case 'critical':
      return colors.danger;
    case 'high':
      return colors.risk;
    case 'medium':
      return colors.warning;
    case 'low':
      return colors.neutral;
    default:
      return colors.unknown;
  }
};

const spanColor = (euiTheme: EuiThemeComputed, status: CaseStatuses): string => {
  if (status === CaseStatuses.open) return euiTheme.colors.backgroundLightSuccess;
  if (status === CaseStatuses['in-progress']) return euiTheme.colors.backgroundLightPrimary;
  return euiTheme.colors.backgroundLightText;
};

const markerColor = (euiTheme: EuiThemeComputed, kind: CaseMarkerKind): string => {
  if (kind === 'closed') return euiTheme.colors.borderStrongText;
  if (kind === 'reopened') return euiTheme.colors.borderStrongWarning;
  if (kind === 'in_progress') return euiTheme.colors.borderStrongPrimary;
  return euiTheme.colors.borderStrongSuccess;
};

const percentAt = (ms: number, { startMs, endMs }: TimeWindow): number =>
  ((ms - startMs) / (endMs - startMs)) * 100;

const isInWindow = (ms: number, window: TimeWindow): boolean =>
  ms >= window.startMs && ms <= window.endMs;

const overlapsWindow = (startMs: number, endMs: number, window: TimeWindow): boolean =>
  endMs > window.startMs && startMs < window.endMs;

/** Left and width of a time range, clipped to the window, in % of the track. */
const clippedRangeStyle = (
  startMs: number,
  endMs: number,
  window: TimeWindow
): React.CSSProperties => {
  const left = percentAt(Math.max(startMs, window.startMs), window);
  const right = percentAt(Math.min(endMs, window.endMs), window);
  return { left: `${left}%`, width: `${right - left}%` };
};

interface TooltipRow {
  readonly label: string;
  readonly value: string | number;
}

/** Tooltip body for canvas elements of the alert rows. */
const TimelineTooltip: React.FC<{ title: string; rows: ReadonlyArray<TooltipRow | false> }> = ({
  title,
  rows,
}) => (
  <TooltipContainer>
    <TooltipHeader>{title}</TooltipHeader>
    {rows.map(
      (row) => row && <TooltipMetricRow key={row.label} label={row.label} metric={row.value} />
    )}
  </TooltipContainer>
);

/** Tooltip body for DOM elements of the case and entry rows. */
const TooltipLines: React.FC<{ rows: ReadonlyArray<TooltipRow | false> }> = ({ rows }) => (
  <EuiDescriptionList
    compressed
    type="inline"
    listItems={rows.flatMap((row) => (row ? [{ title: row.label, description: row.value }] : []))}
  />
);

/**
 * One vertical line across every lane, moved with a CSS transform on pointer move. It lines up an
 * alert with the entries and status changes at the same time and re-renders nothing on hover.
 */
const useCrosshair = (trackEl: HTMLElement | null) => {
  const lineRef = useRef<HTMLDivElement>(null);
  const onPointerMove = useCallback(
    ({ clientX, currentTarget }: React.PointerEvent<HTMLDivElement>) => {
      const line = lineRef.current;
      if (!line || !trackEl) return;
      const track = trackEl.getBoundingClientRect();
      const inside = clientX >= track.left && clientX <= track.right;
      line.style.visibility = inside ? 'visible' : 'hidden';
      if (inside) {
        const offset = clientX - currentTarget.getBoundingClientRect().left;
        line.style.transform = `translateX(${offset}px)`;
      }
    },
    [trackEl]
  );
  const onPointerLeave = useCallback(() => {
    if (lineRef.current) lineRef.current.style.visibility = 'hidden';
  }, []);
  return { lineRef, onPointerMove, onPointerLeave };
};

const distinctSummary = (values: readonly string[]): string =>
  values.length === 0 ? '0' : i18n.DISTINCT_OF(values.slice(0, 3).join(', '), values.length);

interface RowChartProps {
  id: string;
  height: number;
  window: TimeWindow;
  theme: Theme;
  timeZone: string;
  tooltip?: CustomTooltip;
  onBrush: (window: TimeWindow) => void;
  onElementClick?: ElementClickListener;
  onAnnotationClick?: AnnotationClickListener;
  yDomain?: { min: number; max: number };
  children?: React.ReactNode;
}

/** An alert row or the time axis: a chart on the shared x domain whose own series is invisible. */
const RowChart: React.FC<RowChartProps> = ({
  id,
  height,
  window,
  theme,
  timeZone,
  tooltip,
  onBrush,
  onElementClick,
  onAnnotationClick,
  yDomain = { min: 0, max: 1 },
  children,
}) => {
  const onBrushEnd = useCallback<BrushEndListener>(
    ({ x }) => {
      const [startMs, endMs] = x ?? [];
      if (typeof startMs === 'number' && typeof endMs === 'number' && endMs > startMs) {
        onBrush({ startMs, endMs });
      }
    },
    [onBrush]
  );
  const domainData = useMemo(
    () => [
      { x: window.startMs, y: yDomain.min },
      { x: window.endMs, y: yDomain.min },
    ],
    [window, yDomain.min]
  );

  return (
    <Chart size={{ height }}>
      <Settings
        baseTheme={theme}
        theme={ROW_THEME}
        xDomain={{ min: window.startMs, max: window.endMs }}
        showLegend={false}
        onBrushEnd={onBrushEnd}
        onElementClick={onElementClick}
        onAnnotationClick={onAnnotationClick}
        locale={kbnI18n.getLocale()}
      />
      {/* No snapping: the row's only series is the two invisible window-edge points. */}
      <Tooltip
        type={tooltip ? TooltipType.Follow : TooltipType.Crosshairs}
        customTooltip={tooltip}
        showNullValues={false}
        snap={false}
      />
      <Axis
        id={`${id}-y`}
        position={Position.Left}
        hide
        domain={yDomain}
        gridLine={{ visible: false }}
      />
      <LineSeries
        id={`${id}-domain`}
        xScaleType={ScaleType.Time}
        yScaleType={ScaleType.Linear}
        timeZone={timeZone}
        xAccessor="x"
        yAccessors={['y']}
        data={domainData}
        lineSeriesStyle={{ line: { visible: false }, point: { visible: 'never' } }}
        hideInLegend
      />
      {children}
    </Chart>
  );
};

const RowLabel: React.FC<{
  label: string;
  count?: number;
  countLabel?: string;
  countProps?: Record<`data-${string}`, string>;
}> = ({ label, count, countLabel, countProps }) => (
  <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
    <EuiFlexItem
      css={css`
        min-width: 0;
      `}
    >
      <EuiToolTip content={label} display="block">
        <EuiText size="xs" tabIndex={0}>
          <EuiTextBlockTruncate lines={2}>{label}</EuiTextBlockTruncate>
        </EuiText>
      </EuiToolTip>
    </EuiFlexItem>
    {count !== undefined && (
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow" {...countProps}>
          {countLabel ?? count}
        </EuiBadge>
      </EuiFlexItem>
    )}
  </EuiFlexGroup>
);

const LaneRow: React.FC<{
  label?: React.ReactNode;
  height: number;
  trackRef?: (el: HTMLDivElement | null) => void;
  children: React.ReactNode;
  testSubj?: string;
}> = ({ label, height, trackRef, children, testSubj }) => (
  <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center" data-test-subj={testSubj}>
    <EuiFlexItem
      grow={false}
      css={css`
        width: ${LABEL_WIDTH}px;
      `}
    >
      {label}
    </EuiFlexItem>
    <EuiFlexItem
      css={css`
        min-width: 0;
        height: ${height}px;
        position: relative;
      `}
    >
      <div ref={trackRef}>{children}</div>
    </EuiFlexItem>
  </EuiFlexGroup>
);

const LaneHeading: React.FC<{ title: string; badge?: React.ReactNode }> = ({ title, badge }) => (
  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiTitle size="xxxs">
        <h3>{title}</h3>
      </EuiTitle>
    </EuiFlexItem>
    {badge && <EuiFlexItem grow={false}>{badge}</EuiFlexItem>}
  </EuiFlexGroup>
);

/** The part of a case or entry row under its markers, clipped to the window. */
const PlotArea: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    css={css`
      position: absolute;
      top: ${MARKER_ROOM_PX}px;
      bottom: 0;
      left: 0;
      right: 0;
      overflow: hidden;
    `}
  >
    {children}
  </div>
);

const TimeLine: React.FC<{
  atMs: number;
  window: TimeWindow;
  color: string;
  widthPx: number;
}> = ({ atMs, window, color, widthPx }) =>
  isInWindow(atMs, window) ? (
    <div
      aria-hidden={true}
      css={css`
        position: absolute;
        top: 0;
        bottom: 0;
        transform: translateX(-50%);
        pointer-events: none;
      `}
      style={{ left: `${percentAt(atMs, window)}%`, width: widthPx, background: color }}
    />
  ) : null;

/** Case status markers: focusable icons with the change details in a tooltip. */
const CaseMarkers: React.FC<{
  groups: readonly CaseMarkerGroup[];
  window: TimeWindow;
  widthPx: number;
  format: TimeFormat;
}> = ({ groups, window, widthPx, format }) => {
  const { euiTheme } = useEuiTheme();
  const pxPerMs = widthPx / (window.endMs - window.startMs);
  return (
    <>
      {groups.map((group) => {
        const x = (group.atMs - window.startMs) * pxPerMs;
        if (x < 0 || x > widthPx) return null;
        const [first] = group.markers;
        const merged = group.markers.length > 1;
        const title = merged
          ? i18n.MARKER_CHANGES(group.markers.length)
          : i18n.MARKER_LABELS[first.kind];
        return (
          <div
            key={group.atMs}
            data-test-subj="incident-timeline-case-marker"
            css={css`
              position: absolute;
              top: 0;
              left: ${x}px;
              transform: translateX(-50%);
              line-height: 0;
            `}
          >
            <EuiToolTip
              title={title}
              content={group.markers.map((marker, i) => (
                <div key={i}>
                  {merged && <strong>{`${i18n.MARKER_LABELS[marker.kind]} `}</strong>}
                  {formatTime(marker.atMs, format)} {i18n.BY_USER(marker.user)}
                  {marker.source ? ` ${i18n.VIA_SOURCE(marker.source)}` : ''}
                </div>
              ))}
            >
              <span
                tabIndex={0}
                role="img"
                aria-label={i18n.MARKER_ARIA(title, formatTime(group.atMs, format))}
              >
                {merged ? (
                  <EuiBadge color="hollow">{group.markers.length}</EuiBadge>
                ) : (
                  <EuiIcon
                    type={MARKER_ICONS[first.kind]}
                    size="s"
                    color={markerColor(euiTheme, first.kind)}
                    aria-hidden={true}
                  />
                )}
              </span>
            </EuiToolTip>
          </div>
        );
      })}
    </>
  );
};

/** Status spans and status-change lines; the markers above them carry the change details. */
const CaseLane: React.FC<{
  spans: readonly CaseSpan[];
  groups: readonly CaseMarkerGroup[];
  window: TimeWindow;
  widthPx: number;
  format: TimeFormat;
}> = ({ spans, groups, window, widthPx, format }) => {
  const { euiTheme } = useEuiTheme();
  const spanHeightPx = (CASE_ROW_HEIGHT - MARKER_ROOM_PX) / 2;

  return (
    <>
      <PlotArea>
        {spans.map((span) => {
          if (!overlapsWindow(span.startMs, span.endMs, window)) return null;
          const status = statuses[span.status].label;
          const range = formatRange(span.startMs, span.endMs, format);
          const duration = formatDuration(span.endMs - span.startMs);
          return (
            <div
              key={span.startMs}
              css={css`
                position: absolute;
                top: 25%;
              `}
              style={clippedRangeStyle(span.startMs, span.endMs, window)}
            >
              <EuiToolTip
                title={status}
                content={
                  <TooltipLines
                    rows={[
                      { label: i18n.COLUMN_TIME, value: range },
                      { label: i18n.DURATION, value: duration },
                    ]}
                  />
                }
                display="block"
              >
                <span
                  tabIndex={0}
                  role="img"
                  aria-label={i18n.CASE_SPAN_ARIA(status, range, duration)}
                  data-test-subj="incident-timeline-case-span"
                  css={css`
                    display: block;
                    height: ${spanHeightPx}px;
                    background: ${spanColor(euiTheme, span.status)};
                  `}
                />
              </EuiToolTip>
            </div>
          );
        })}
        {groups.map((group) => {
          const merged = group.markers.length > 1;
          return (
            <TimeLine
              key={group.atMs}
              atMs={group.atMs}
              window={window}
              color={
                merged
                  ? euiTheme.colors.textParagraph
                  : markerColor(euiTheme, group.markers[0].kind)
              }
              widthPx={merged ? 3 : 2}
            />
          );
        })}
      </PlotArea>
      <CaseMarkers groups={groups} window={window} widthPx={widthPx} format={format} />
    </>
  );
};

const entryTimeText = (entry: TimelineEntry, format: TimeFormat): string =>
  entry.endMs !== undefined
    ? formatRange(entry.occurredMs, entry.endMs, format)
    : formatTime(entry.occurredMs, format);

const entryTooltipRows = (entry: TimelineEntry, format: TimeFormat): Array<TooltipRow | false> => [
  { label: i18n.FIELD_CATEGORY, value: i18n.CATEGORY_LABELS[entry.category] },
  { label: i18n.COLUMN_TIME, value: entryTimeText(entry, format) },
  entry.data.content !== undefined && {
    label: i18n.FIELD_TEXT,
    value: entry.data.content.slice(0, 300),
  },
  { label: i18n.CREATED_BY, value: entry.createdBy },
];

let measureCanvas: HTMLCanvasElement | undefined;
const textMeasurer = (font: string) => {
  measureCanvas = measureCanvas ?? document.createElement('canvas');
  const context = measureCanvas.getContext('2d');
  if (context) context.font = font;
  return (text: string): number => context?.measureText(text).width ?? text.length * 7;
};

const entryRowHeight = (levels: number): number =>
  Math.max(ENTRY_ROW_HEIGHT, levels * ENTRY_LEVEL_PX + ENTRY_LEVEL_PX / 2);

/** Entry flags with their titles, as focusable links, one level per overlap. */
const EntryMarkers: React.FC<{
  layout: EntryLabelLayout;
  selectedId?: string;
  format: TimeFormat;
  onEntryClick: (entry: TimelineEntry) => void;
}> = ({ layout, selectedId, format, onEntryClick }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <>
      {layout.boxes.map(({ entry, left, width, level, side }) => (
        <div
          key={entry.id}
          css={css`
            position: absolute;
            top: ${level * ENTRY_LEVEL_PX}px;
            left: ${left}px;
            width: ${width}px;
          `}
        >
          <EuiToolTip
            title={entry.data.title}
            content={<TooltipLines rows={entryTooltipRows(entry, format)} />}
            display="block"
          >
            <EuiLink
              color="text"
              onClick={() => onEntryClick(entry)}
              aria-label={entry.data.title}
              data-test-subj="incident-timeline-entry-marker"
              css={css`
                display: flex;
                flex-direction: ${side === 'right' ? 'row' : 'row-reverse'};
                align-items: center;
                gap: ${euiTheme.size.xs};
                width: 100%;
              `}
            >
              <EuiIcon
                type="flag"
                size="s"
                color={entry.id === selectedId ? 'primary' : 'accent'}
                aria-hidden={true}
                css={css`
                  flex: 0 0 ${ENTRY_FLAG_PX}px;
                `}
              />
              {width > ENTRY_FLAG_PX && (
                <EuiText size="xs" className="eui-textTruncate">
                  {entry.data.title}
                </EuiText>
              )}
            </EuiLink>
          </EuiToolTip>
        </div>
      ))}
    </>
  );
};

/**
 * Entry ranges and time lines under the flags. A range bar selects its entry on click; it stays out
 * of the tab order because the entry's flag is the keyboard control for the same action.
 */
const EntryLane: React.FC<{
  row: EntryRow;
  layout: EntryLabelLayout;
  height: number;
  window: TimeWindow;
  selectedId?: string;
  format: TimeFormat;
  onEntryClick: (entry: TimelineEntry) => void;
}> = ({ row, layout, height, window, selectedId, format, onEntryClick }) => {
  const { euiTheme } = useEuiTheme();
  const rangeHeightPx = (height - MARKER_ROOM_PX) * 0.4;

  return (
    <>
      <PlotArea>
        {row.entries.map((entry) => {
          const selected = entry.id === selectedId;
          const color = selected ? euiTheme.colors.primary : euiTheme.colors.accent;
          return (
            <React.Fragment key={entry.id}>
              {entry.endMs !== undefined &&
                overlapsWindow(entry.occurredMs, entry.endMs, window) && (
                  <div
                    css={css`
                      position: absolute;
                      top: 30%;
                    `}
                    style={clippedRangeStyle(entry.occurredMs, entry.endMs, window)}
                  >
                    <EuiToolTip
                      title={entry.data.title}
                      content={<TooltipLines rows={entryTooltipRows(entry, format)} />}
                      display="block"
                    >
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-hidden={true}
                        onClick={() => onEntryClick(entry)}
                        data-test-subj="incident-timeline-entry-range"
                        css={css`
                          display: block;
                          width: 100%;
                          height: ${rangeHeightPx}px;
                          padding: 0;
                          border: none;
                          cursor: pointer;
                          background: ${color};
                          opacity: ${selected ? 0.8 : 0.5};
                        `}
                      />
                    </EuiToolTip>
                  </div>
                )}
              <TimeLine
                atMs={entry.occurredMs}
                window={window}
                color={color}
                widthPx={selected ? 3 : 2}
              />
            </React.Fragment>
          );
        })}
      </PlotArea>
      <EntryMarkers
        layout={layout}
        selectedId={selectedId}
        format={format}
        onEntryClick={onEntryClick}
      />
    </>
  );
};

/** `@timestamp` stands in for a missing event time; such points are drawn hollow. */
const isFallbackTime = (alert: IncidentTimelineAlert): boolean => alert.timeSource === 'timestamp';

const AlertRowChart: React.FC<{
  row: AlertRow;
  rendering: AlertRowRendering;
  widthPx: number;
  window: TimeWindow;
  selectedAlertId?: string;
  common: Omit<RowChartProps, 'id' | 'height'>;
  format: TimeFormat;
  onAlertClick: (alert: IncidentTimelineAlert, ruleName: string) => void;
  onCellClick: (cell: AlertCell) => void;
}> = ({
  row,
  rendering,
  widthPx,
  window,
  selectedAlertId,
  common,
  format,
  onAlertClick,
  onCellClick,
}) => {
  const { euiTheme } = useEuiTheme();

  const onElementClick = useCallback<ElementClickListener>(
    (elements) => {
      const [geometry] = elements[0] as XYChartElementEvent;
      const datum = geometry.datum as AlertPointDatum | undefined;
      if (datum?.alert) onAlertClick(datum.alert, row.ruleName);
    },
    [onAlertClick, row.ruleName]
  );

  const onAnnotationClick = useCallback<AnnotationClickListener>(
    ({ rects }) => {
      if (rendering.kind !== 'cells') return;
      const index = Number(rects[0]?.datum.details);
      const cell = rendering.cells[index];
      if (cell) onCellClick(cell);
    },
    [rendering, onCellClick]
  );

  const pointStyle = useCallback<PointStyleAccessor>(
    ({ datum }) => {
      const { alert } = datum as AlertPointDatum;
      const color = severityColor(euiTheme, alert.severity);
      return isFallbackTime(alert)
        ? { stroke: color, fill: euiTheme.colors.backgroundBasePlain, strokeWidth: 2 }
        : { stroke: color, fill: color, strokeWidth: 1 };
    },
    [euiTheme]
  );

  const pointTooltip = useCallback<CustomTooltip>(
    ({ values }) => {
      const datum = values.find((value) => (value.datum as AlertPointDatum)?.alert)?.datum as
        | AlertPointDatum
        | undefined;
      if (!datum) return null;
      const { alert } = datum;
      const timeMs = Date.parse(alert.time);
      const writeMs = Date.parse(alert.timestamp);
      return (
        <TimelineTooltip
          title={row.ruleName}
          rows={[
            { label: i18n.ALERT_TIME, value: formatTime(timeMs, format) },
            alert.timeSource !== 'original_time' && {
              label: i18n.COLUMN_TIME_SOURCE,
              value:
                alert.timeSource === 'timestamp'
                  ? i18n.EVENT_TIME_UNAVAILABLE
                  : i18n.SEQUENCE_START_TIME,
            },
            alert.timeSource !== 'timestamp' &&
              Math.abs(writeMs - timeMs) > 60 * 1000 && {
                label: i18n.WRITE_TIME,
                value: formatTime(writeMs, format),
              },
            alert.hostNames.length > 0 && { label: i18n.HOSTS, value: alert.hostNames.join(', ') },
            alert.userNames.length > 0 && { label: i18n.USERS, value: alert.userNames.join(', ') },
            alert.severity !== undefined && { label: i18n.SEVERITY, value: alert.severity },
          ]}
        />
      );
    },
    [row.ruleName, format]
  );

  const slots = TIMELINE_DENSITY.pointStackSlots;
  const yDomain = { min: -0.5, max: slots - 0.5 };

  if (rendering.kind === 'cells') {
    const maxCount = Math.max(...rendering.cells.map(({ count }) => count));
    const pxPerMs = widthPx / (window.endMs - window.startMs);
    return (
      <>
        <RowChart
          id={`incident-timeline-alerts-${row.ruleId}`}
          height={ALERT_ROW_HEIGHT}
          {...common}
          yDomain={yDomain}
          onAnnotationClick={onAnnotationClick}
        >
          {rendering.cells.map((cell, index) => (
            <RectAnnotation
              key={`cell-${index}`}
              id={`cell-${index}`}
              dataValues={[
                { coordinates: { x0: cell.startMs, x1: cell.endMs }, details: `${index}` },
              ]}
              style={{
                fill: euiTheme.colors.vis.euiColorVis0,
                opacity: 0.25 + 0.75 * (cell.count / maxCount),
                stroke: euiTheme.colors.backgroundBasePlain,
                strokeWidth: 1,
              }}
              customTooltip={() => (
                <TimelineTooltip
                  title={row.ruleName}
                  rows={[
                    {
                      label: i18n.COLUMN_TIME,
                      value: formatRange(cell.startMs, cell.endMs, format),
                    },
                    { label: i18n.LANE_ALERTS, value: cell.count },
                    { label: i18n.HOSTS, value: distinctSummary(cell.hostNames) },
                    { label: i18n.USERS, value: distinctSummary(cell.userNames) },
                  ]}
                />
              )}
            />
          ))}
        </RowChart>
        {rendering.cells.map((cell) => {
          const left = (cell.startMs - window.startMs) * pxPerMs;
          const width = (cell.endMs - cell.startMs) * pxPerMs;
          if (width < MIN_CELL_LABEL_PX || left < 0 || left + width > widthPx) return null;
          return (
            <span
              key={cell.startMs}
              css={css`
                position: absolute;
                top: 0;
                left: ${left}px;
                width: ${width}px;
                line-height: ${ALERT_ROW_HEIGHT}px;
                text-align: center;
                font-size: ${euiTheme.size.m};
                pointer-events: none;
                color: ${cell.count / maxCount > 0.5
                  ? euiTheme.colors.textInverse
                  : euiTheme.colors.textParagraph};
              `}
            >
              {cell.count}
            </span>
          );
        })}
      </>
    );
  }

  const data = rendering.points.map<AlertPointDatum>(({ alert, timeMs, stack }) => ({
    x: timeMs,
    y: stack,
    alert,
  }));
  const selected = rendering.points.find(({ alert }) => alert.id === selectedAlertId);

  return (
    <RowChart
      id={`incident-timeline-alerts-${row.ruleId}`}
      height={ALERT_ROW_HEIGHT}
      {...common}
      yDomain={yDomain}
      tooltip={pointTooltip}
      onElementClick={onElementClick}
    >
      <LineSeries
        id="alerts"
        xScaleType={ScaleType.Time}
        yScaleType={ScaleType.Linear}
        timeZone={format.timeZone}
        xAccessor="x"
        yAccessors={['y']}
        data={data}
        hideInLegend
        lineSeriesStyle={{
          line: { visible: false },
          point: { visible: 'always', radius: ALERT_POINT_RADIUS_PX, opacity: 1 },
        }}
        pointStyleAccessor={pointStyle}
      />
      {selected && (
        <LineSeries
          id="alerts-selected"
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          timeZone={format.timeZone}
          xAccessor="x"
          yAccessors={['y']}
          data={[{ x: selected.timeMs, y: selected.stack, alert: selected.alert }]}
          hideInLegend
          lineSeriesStyle={{
            line: { visible: false },
            point: {
              visible: 'always',
              radius: 7,
              strokeWidth: 2,
              opacity: 0.4,
              fill: euiTheme.colors.textParagraph,
              stroke: euiTheme.colors.textParagraph,
            },
          }}
        />
      )}
    </RowChart>
  );
};

/**
 * Candidate A. Case and entry lanes are DOM rows; alert rows and the time axis are
 * `@elastic/charts` charts. All share one time track column and one crosshair.
 */
export const ElasticChartsRenderer: React.FC<TimelineRendererProps> = ({
  model,
  window,
  selection,
  alertsPlaceholder,
  onBrush,
  onAlertClick,
  onCellClick,
  onEntryClick,
}) => {
  const { euiTheme } = useEuiTheme();
  const format = useTimeFormat();
  const { timeZone } = format;
  const theme = useElasticChartsTheme();
  const [axisEl, setAxisEl] = useState<HTMLDivElement | null>(null);
  const { width } = useResizeObserver(axisEl, 'width');
  const widthPx = Math.max(width, 1);
  const { lineRef, onPointerMove, onPointerLeave } = useCrosshair(axisEl);

  const common = useMemo(
    () => ({ window, theme, timeZone, onBrush }),
    [window, theme, timeZone, onBrush]
  );
  const markerGroups = useMemo(
    () => groupCaseMarkers(model.caseLane.markers, window, widthPx, TIMELINE_DENSITY),
    [model.caseLane.markers, window, widthPx]
  );
  const entryLayouts = useMemo(() => {
    const fontPx = euiTheme.font.scale.xs * euiTheme.base;
    const measure = textMeasurer(`${fontPx}px ${euiTheme.font.family}`);
    return model.entryRows.map((row) => layoutEntryLabels(row.entries, window, widthPx, measure));
  }, [
    model.entryRows,
    window,
    widthPx,
    euiTheme.font.scale.xs,
    euiTheme.base,
    euiTheme.font.family,
  ]);
  const alertRenderings = useMemo(
    () => model.alertRows.map((row) => renderAlertRow(row, window, widthPx, TIMELINE_DENSITY)),
    [model.alertRows, window, widthPx]
  );
  const hasHollowPoints = alertRenderings.some(
    (rendering) =>
      rendering.kind === 'points' && rendering.points.some(({ alert }) => isFallbackTime(alert))
  );
  const selectedAlertId = selection?.kind === 'alert' ? selection.alert.id : undefined;
  const selectedEntryId = selection?.kind === 'entry' ? selection.entry.id : undefined;

  return (
    <EuiFlexGroup direction="column" gutterSize="xs" data-test-subj="incident-timeline-renderer-a">
      <div
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        data-test-subj="incident-timeline-lanes"
        css={css`
          position: relative;
        `}
      >
        <EuiFlexGroup direction="column" gutterSize="xs">
          <LaneHeading title={i18n.LANE_CASE} />
          <LaneRow
            label={
              <RowLabel
                label={i18n.CASE_STATUS_ROW}
                count={model.reopenCount}
                countLabel={i18n.REOPEN_COUNT(model.reopenCount)}
                countProps={{ 'data-test-subj': 'incidentTimelineReopenCount' }}
              />
            }
            height={CASE_ROW_HEIGHT}
            testSubj="incident-timeline-case-lane"
          >
            <CaseLane
              spans={model.caseLane.spans}
              groups={markerGroups}
              window={window}
              widthPx={widthPx}
              format={format}
            />
          </LaneRow>

          {model.entryRows.length > 0 && (
            <>
              <LaneHeading title={i18n.LANE_ENTRIES} />
              {model.entryRows.map((row, index) => {
                const layout = entryLayouts[index];
                const height = entryRowHeight(layout.levels);
                return (
                  <LaneRow
                    key={row.category}
                    label={
                      <RowLabel
                        label={i18n.CATEGORY_LABELS[row.category]}
                        count={row.entries.length}
                      />
                    }
                    height={height}
                    testSubj={`incident-timeline-entry-row-${row.category}`}
                  >
                    <EntryLane
                      row={row}
                      layout={layout}
                      height={height}
                      window={window}
                      selectedId={selectedEntryId}
                      format={format}
                      onEntryClick={onEntryClick}
                    />
                  </LaneRow>
                );
              })}
            </>
          )}

          <LaneHeading
            title={i18n.LANE_ALERTS}
            badge={
              alertsPlaceholder === undefined && (
                <EuiBadge color="hollow" data-test-subj="incidentTimelineAlertCount">
                  {i18n.ALERT_COUNT(model.alertCount)}
                </EuiBadge>
              )
            }
          />
          {alertsPlaceholder ??
            model.alertRows.map((row, index) => (
              <LaneRow
                key={row.ruleId}
                label={
                  <RowLabel
                    label={row.ruleName}
                    count={row.alerts.length}
                    countProps={{
                      'data-test-subj': 'incidentTimelineRuleRowCount',
                      'data-rule-id': row.ruleId,
                    }}
                  />
                }
                height={ALERT_ROW_HEIGHT}
                testSubj="incident-timeline-alert-row"
              >
                <AlertRowChart
                  row={row}
                  rendering={alertRenderings[index]}
                  widthPx={widthPx}
                  window={window}
                  selectedAlertId={selectedAlertId}
                  common={common}
                  format={format}
                  onAlertClick={onAlertClick}
                  onCellClick={onCellClick}
                />
              </LaneRow>
            ))}

          <LaneRow height={AXIS_HEIGHT} trackRef={setAxisEl}>
            <RowChart id="incident-timeline-axis" height={AXIS_HEIGHT} {...common}>
              <Axis
                id="incident-timeline-time"
                position={Position.Bottom}
                gridLine={{ visible: false }}
              />
            </RowChart>
          </LaneRow>
        </EuiFlexGroup>
        <div
          ref={lineRef}
          aria-hidden={true}
          data-test-subj="incident-timeline-crosshair"
          css={css`
            position: absolute;
            top: 0;
            bottom: 0;
            left: 0;
            width: ${theme.crosshair.line.strokeWidth}px;
            background: ${theme.crosshair.line.stroke};
            pointer-events: none;
            visibility: hidden;
          `}
        />
      </div>
      {alertsPlaceholder === undefined && hasHollowPoints && (
        <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
          <EuiFlexItem
            grow={false}
            css={css`
              width: ${LABEL_WIDTH}px;
            `}
          />
          <EuiFlexItem>
            <EuiText size="xs" color="subdued" data-test-subj="incident-timeline-hollow-legend">
              <span
                aria-hidden={true}
                css={css`
                  display: inline-block;
                  width: 8px;
                  height: 8px;
                  margin-right: ${euiTheme.size.xs};
                  border: 2px solid ${euiTheme.colors.textSubdued};
                  border-radius: 50%;
                `}
              />
              {i18n.HOLLOW_POINTS_LEGEND}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </EuiFlexGroup>
  );
};

TimelineTooltip.displayName = 'TimelineTooltip';
TooltipLines.displayName = 'TooltipLines';
RowChart.displayName = 'RowChart';
RowLabel.displayName = 'RowLabel';
LaneRow.displayName = 'LaneRow';
LaneHeading.displayName = 'LaneHeading';
PlotArea.displayName = 'PlotArea';
TimeLine.displayName = 'TimeLine';
CaseMarkers.displayName = 'CaseMarkers';
CaseLane.displayName = 'CaseLane';
EntryMarkers.displayName = 'EntryMarkers';
EntryLane.displayName = 'EntryLane';
AlertRowChart.displayName = 'AlertRowChart';
ElasticChartsRenderer.displayName = 'ElasticChartsRenderer';
