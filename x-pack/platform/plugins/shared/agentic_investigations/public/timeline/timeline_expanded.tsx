/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonEmpty,
  EuiFieldSearch,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiIcon,
  EuiPopover,
  EuiPortal,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CONVERSATION_DETAILS_FLYOUT_HISTORY_KEY } from '@kbn/agent-builder-browser';
import type {
  ImpactMapEvent,
  ImpactMapEventKind,
  InvestigationImpactMapResponse,
} from '../../common';
import { buildTimeScale, formatTimelineClock, selectTimelineSummary } from '../../common';
import {
  EVENT_GROUPS,
  EventDetail,
  EventKeyFacts,
  describeEventTarget,
  getEntityIcon,
  getEventEntityIds,
} from '../conversation_templates/templates/investigation/flyout/impact_map_events';
import {
  FilterPopover,
  type FilterOption,
} from '../conversation_templates/templates/investigation/flyout/event_filter_popover';
import { formatDuration } from '../conversation_templates/templates/investigation/flyout/timeline_event';
import { KindDot } from './timeline_summary';
import { EventHoverCard } from './event_hover_card';
import { EntityHoverCard } from './entity_hover_card';

const TITLE = i18n.translate('xpack.agenticInvestigations.timelineExpanded.title', {
  defaultMessage: 'Timeline',
});
const SEARCH = i18n.translate('xpack.agenticInvestigations.timelineExpanded.search', {
  defaultMessage: 'Search events',
});
const ENTITY = i18n.translate('xpack.agenticInvestigations.timelineExpanded.entity', {
  defaultMessage: 'Entity',
});
const TYPE = i18n.translate('xpack.agenticInvestigations.timelineExpanded.type', {
  defaultMessage: 'Type',
});
const SEARCH_ENTITIES = i18n.translate(
  'xpack.agenticInvestigations.timelineExpanded.searchEntities',
  { defaultMessage: 'Search entities' }
);
const INVESTIGATION_LANE = i18n.translate(
  'xpack.agenticInvestigations.timelineExpanded.investigationLane',
  { defaultMessage: 'Investigation' }
);
const RESET_RANGE = i18n.translate('xpack.agenticInvestigations.timelineExpanded.resetRange', {
  defaultMessage: 'Reset time range',
});
const CLEAR_FILTERS = i18n.translate('xpack.agenticInvestigations.timelineExpanded.clear', {
  defaultMessage: 'Clear filters',
});
const NO_MATCHES = i18n.translate('xpack.agenticInvestigations.timelineExpanded.noMatches', {
  defaultMessage: 'No events match these filters.',
});

const LABEL_WIDTH = 180;
const LANE_HEIGHT = 56;
const MARKER = 24;
/** Markers that would sit on one another overlap by this much, on the same line. */
const MARKER_OVERLAP_STEP = 14;

interface Lane {
  id: string;
  label: string;
  icon: string;
  events: ImpactMapEvent[];
}

/**
 * The whole investigation on one time axis: a lane for each entity that something happened to,
 * the highlighted windows shaded behind them, and a chart under the lanes. Hovering or clicking
 * an event shows its detail underneath.
 */
/** What the timeline starts on: entities to filter by, or an event to mark. */
export interface TimelineFocus {
  entityIds: string[];
  eventId?: string;
}

const TimelineExpanded: React.FC<{
  impactMap: InvestigationImpactMapResponse;
  focus: TimelineFocus;
  /** Opens the entity's own flyout, which a click on a lane's name asks for. */
  onOpenEntity?: (entityId: string) => void;
}> = ({ impactMap, focus, onOpenEntity }) => {
  const { euiTheme } = useEuiTheme();
  const { events, entities, relationships, entity_types: entityTypes } = impactMap;
  const summary = useMemo(
    () => selectTimelineSummary({ events, relationships, timeline: impactMap.timeline }),
    [events, relationships, impactMap.timeline]
  );
  const windows = summary?.windows ?? [];
  // It opens with the filters the agent applied, unless it was asked for particular entities or
  // an event, which would otherwise be filtered out. The reader can clear them.
  const focused = focus.entityIds.length > 0 || Boolean(focus.eventId);
  const [text, setText] = useState('');
  const [entityFilter, setEntityFilter] = useState<string[]>(() =>
    focus.entityIds.length > 0 ? focus.entityIds : focused ? [] : summary?.filters?.entity_ids ?? []
  );
  const [kindFilter, setKindFilter] = useState<string[]>(() =>
    focused ? [] : summary?.filters?.kinds ?? []
  );
  const [selectedId, setSelectedId] = useState<string | undefined>(focus.eventId);
  const detailRef = useRef<HTMLDivElement>(null);
  const [hoverId, setHoverId] = useState<string>();
  const [hoverLaneId, setHoverLaneId] = useState<string>();
  // The time range dragged out on the lanes. Absent, every event is in view.
  const [range, setRange] = useState<{ from: number; to: number } | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ start: number; end: number } | null>(null);
  const isFiltered = entityFilter.length > 0 || kindFilter.length > 0 || text.trim() !== '';
  const clearFilters = () => {
    setEntityFilter([]);
    setKindFilter([]);
    setText('');
  };

  const matches = (
    event: ImpactMapEvent,
    { entityIds, kinds, search }: { entityIds?: string[]; kinds?: string[]; search?: string }
  ) => {
    if (kinds?.length && !kinds.includes(event.kind)) return false;
    if (
      entityIds?.length &&
      !getEventEntityIds(event, relationships).some((id) => entityIds.includes(id))
    ) {
      return false;
    }
    const needle = search?.trim().toLowerCase();
    return (
      !needle ||
      [event.title, event.description ?? '', describeEventTarget(event, impactMap)].some((value) =>
        value.toLowerCase().includes(needle)
      )
    );
  };

  const visible = useMemo(
    () =>
      events
        .filter(
          (event) =>
            (!range ||
              (Date.parse(event.at) <= range.to &&
                Date.parse(event.ends_at ?? event.at) >= range.from)) &&
            matches(event, { entityIds: entityFilter, kinds: kindFilter, search: text })
        )
        .sort((a, b) => Date.parse(a.at) - Date.parse(b.at)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, entityFilter, kindFilter, text, range]
  );

  const entityOptions = useMemo<FilterOption[]>(() => {
    const types = new Map(entityTypes.map((type) => [type.id, type]));
    const counts = new Map<string, number>();
    events
      .filter((event) => matches(event, { kinds: kindFilter, search: text }))
      .forEach((event) =>
        getEventEntityIds(event, relationships).forEach((id) =>
          counts.set(id, (counts.get(id) ?? 0) + 1)
        )
      );
    return entities
      .filter(({ id }) => counts.has(id) || entityFilter.includes(id))
      .map(({ id, label, type_id: typeId }) => ({
        key: id,
        label,
        count: counts.get(id) ?? 0,
        icon: getEntityIcon(types.get(typeId)),
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, entities, entityTypes, relationships, kindFilter, entityFilter, text]);

  const kindOptions = useMemo<FilterOption[]>(() => {
    const scoped = events.filter((event) =>
      matches(event, { entityIds: entityFilter, search: text })
    );
    return EVENT_GROUPS.map(({ id, label, icon, color }) => ({
      key: id,
      label,
      iconColor: color,
      count: scoped.filter(({ kind }) => kind === id).length,
      icon,
    })).filter(({ key, count }) => count > 0 || kindFilter.includes(key));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, entityFilter, kindFilter, text]);

  const lanes = useMemo<Lane[]>(() => {
    const types = new Map(entityTypes.map((type) => [type.id, type]));
    const byLane = new Map<string, Lane>();
    const known = new Map(entities.map((entity) => [entity.id, entity]));
    visible.forEach((event) => {
      // An event's lane is the entity it happened to: the first end of its relationship the map
      // lists. A lane is only ever an entity the map lists; an id it does not list is not made up
      // into one, so that event sits under "Investigation".
      const laneId = getEventEntityIds(event, relationships).find((id) => known.has(id));
      const entity = laneId ? known.get(laneId) : undefined;
      const id = laneId ?? 'investigation';
      if (!byLane.has(id)) {
        byLane.set(id, {
          id,
          label: entity ? entity.label ?? entity.id : INVESTIGATION_LANE,
          icon: entity ? getEntityIcon(types.get(entity.type_id)) : 'search',
          events: [],
        });
      }
      byLane.get(id)?.events.push(event);
    });
    return [...byLane.values()];
  }, [visible, entities, entityTypes, relationships]);

  const chart = summary?.chartEvent?.evidence?.chart;
  // The series that is the trouble when the chart has several: failures, errors, drops.
  const chartSeries = useMemo(
    () =>
      chart?.series?.find(({ name }) => /fail|error|drop|reject|lost|timeout/i.test(name)) ??
      chart?.series?.[0],
    [chart]
  );
  const chartPoints = useMemo(() => {
    const series = chartSeries;
    const points = (series?.points ?? [])
      .map(({ x, y }) => ({ ms: Date.parse(x), y }))
      .filter(({ ms }) => !Number.isNaN(ms))
      .sort((a, b) => a.ms - b.ms);
    const inRange = range
      ? points.filter(
          ({ ms }, index) => ms <= range.to && (points[index + 1]?.ms ?? ms) >= range.from
        )
      : points;
    return inRange.length >= 2 ? inRange : [];
  }, [chartSeries, range]);

  const scale = useMemo(
    () =>
      range
        ? // A dragged range is drawn to scale, edge to edge.
          buildTimeScale([range.from, range.to], { padShare: 0 })
        : buildTimeScale([
            ...visible.flatMap(({ at, ends_at: endsAt }) => [
              Date.parse(at),
              ...(endsAt ? [Date.parse(endsAt)] : []),
            ]),
            ...windows.flatMap(({ start, end }) => [Date.parse(start), Date.parse(end)]),
            ...chartPoints.map(({ ms }) => ms),
          ]),
    [range, visible, windows, chartPoints]
  );

  const shown = events.find(({ id }) => id === selectedId);
  // Choosing an event brings its detail into view, below the lanes.
  useEffect(() => {
    if (selectedId) detailRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedId]);
  const first = visible[0] && Date.parse(visible[0].at);
  const last = visible[visible.length - 1] && Date.parse(visible[visible.length - 1].at);
  const pct = (value: number) => `${(value * 100).toFixed(3)}%`;

  const toggleKind = (kind: string) =>
    setKindFilter((current) =>
      current.includes(kind) ? current.filter((id) => id !== kind) : [...current, kind]
    );

  const maxY = Math.max(...chartPoints.map(({ y }) => y), 1);

  // Dragging across the lanes picks a time range; the view follows it.
  const fractionAt = (clientX: number) => {
    const box = trackRef.current?.getBoundingClientRect();
    return box && box.width > 0 ? Math.min(Math.max((clientX - box.left) / box.width, 0), 1) : 0;
  };
  const finishDrag = () => {
    if (drag && scale) {
      const [a, b] = [Math.min(drag.start, drag.end), Math.max(drag.start, drag.end)];
      const width = trackRef.current?.getBoundingClientRect().width ?? 0;
      // A click, or a drag too short to mean a range, selects nothing.
      if ((b - a) * width >= 10) {
        const from = scale.toMs(a);
        const to = scale.toMs(b);
        if (to - from >= 60_000) setRange({ from, to });
      }
    }
    setDrag(null);
  };
  const dayOf = (ms: number) => {
    const date = new Date(ms);
    return `${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(
      2,
      '0'
    )}`;
  };
  const rangeLabel = range
    ? `${dayOf(range.from)} ${formatTimelineClock(new Date(range.from).toISOString())} – ${dayOf(
        range.to
      )} ${formatTimelineClock(new Date(range.to).toISOString())}`
    : undefined;

  return (
    <div data-test-subj="agenticInvestigationsTimelineExpanded">
      <EuiFlexGroup gutterSize="s" responsive={false} wrap>
        <EuiFlexItem css={{ minWidth: 200 }}>
          <EuiFieldSearch
            fullWidth
            compressed
            placeholder={SEARCH}
            value={text}
            onChange={(event) => setText(event.target.value)}
            isClearable
            aria-label={SEARCH}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFilterGroup compressed>
            <FilterPopover
              label={ENTITY}
              options={entityOptions}
              selected={entityFilter}
              onChange={setEntityFilter}
              searchable
              searchPlaceholder={SEARCH_ENTITIES}
              testSubj="agenticInvestigationsTimelineExpandedEntityFilter"
            />
            <FilterPopover
              label={TYPE}
              options={kindOptions}
              selected={kindFilter}
              onChange={setKindFilter}
              testSubj="agenticInvestigationsTimelineExpandedTypeFilter"
            />
          </EuiFilterGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        responsive={false}
        css={{ marginTop: euiTheme.size.m }}
      >
        <EuiFlexItem grow={false}>
          <EuiText
            size="s"
            color="subdued"
            data-test-subj="agenticInvestigationsTimelineExpandedCount"
          >
            {isFiltered || range
              ? i18n.translate('xpack.agenticInvestigations.timelineExpanded.summaryFiltered', {
                  defaultMessage: 'Showing {shown} of {total} events',
                  values: { shown: visible.length, total: events.length },
                })
              : i18n.translate('xpack.agenticInvestigations.timelineExpanded.summary', {
                  defaultMessage: '{total, plural, one {# event} other {# events}} over {duration}',
                  values: {
                    total: visible.length,
                    duration:
                      first !== undefined && last !== undefined
                        ? formatDuration(last - first)
                        : '0m',
                  },
                })}
          </EuiText>
        </EuiFlexItem>
        {range && (
          <>
            <EuiFlexItem grow={false}>
              <EuiText
                size="s"
                color="subdued"
                data-test-subj="agenticInvestigationsTimelineExpandedRange"
              >
                {rangeLabel}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                iconType="refresh"
                onClick={() => setRange(null)}
                data-test-subj="agenticInvestigationsTimelineExpandedResetRange"
              >
                {RESET_RANGE}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </>
        )}
        {isFiltered && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              onClick={clearFilters}
              data-test-subj="agenticInvestigationsTimelineExpandedClear"
            >
              {CLEAR_FILTERS}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiFlexGroup
        justifyContent="spaceBetween"
        alignItems="flexStart"
        gutterSize="m"
        responsive={false}
        css={{ marginTop: euiTheme.size.xs }}
      >
        <EuiFlexItem>
          {/* The legend is the Type filter too: a kind is chosen or cleared by clicking it. */}
          <EuiFlexGroup
            gutterSize="xs"
            wrap
            responsive={false}
            data-test-subj="agenticInvestigationsTimelineExpandedLegend"
          >
            {kindOptions.map(({ key, label, count }) => {
              const isSelected = kindFilter.includes(key);
              const isDimmed = kindFilter.length > 0 && !isSelected;
              return (
                <EuiFlexItem key={key} grow={false}>
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggleKind(key)}
                    data-test-subj={`agenticInvestigationsTimelineExpandedLegend-${key}`}
                    css={css`
                      display: flex;
                      align-items: center;
                      gap: ${euiTheme.size.xs};
                      padding: ${euiTheme.size.xxs} ${euiTheme.size.s} ${euiTheme.size.xxs}
                        ${euiTheme.size.xxs};
                      border: 1px solid ${isSelected ? euiTheme.colors.primary : 'transparent'};
                      border-radius: ${euiTheme.size.l};
                      background: ${isSelected
                        ? euiTheme.colors.backgroundBasePrimary
                        : 'transparent'};
                      color: inherit;
                      font: inherit;
                      cursor: pointer;
                      opacity: ${isDimmed ? 0.5 : 1};
                      &:hover,
                      &:focus-visible {
                        background: ${euiTheme.colors.backgroundBaseInteractiveHover};
                        opacity: 1;
                      }
                    `}
                  >
                    <KindDot kind={key as ImpactMapEventKind} size="s" />
                    <EuiText size="s" component="span">
                      {label} {count}
                    </EuiText>
                  </button>
                </EuiFlexItem>
              );
            })}
          </EuiFlexGroup>
        </EuiFlexItem>
        {windows.length > 0 && (
          // What the shaded band means, at the top right of the legend.
          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              gutterSize="xs"
              alignItems="center"
              responsive={false}
              data-test-subj="agenticInvestigationsTimelineExpandedWindowLegend"
              css={{ marginTop: euiTheme.size.xs }}
            >
              <EuiFlexItem grow={false}>
                <span
                  aria-hidden
                  css={css`
                    display: block;
                    inline-size: 14px;
                    block-size: 10px;
                    background: color-mix(in srgb, ${euiTheme.colors.danger} 14%, transparent);
                    border-inline: 1px solid ${euiTheme.colors.danger};
                  `}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {i18n.translate('xpack.agenticInvestigations.timelineExpanded.customerImpact', {
                    defaultMessage: 'Customer impact',
                  })}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      {!scale || lanes.length === 0 ? (
        <EuiText size="s" color="subdued" css={{ marginTop: euiTheme.size.l }}>
          <p>{NO_MATCHES}</p>
        </EuiText>
      ) : (
        <div
          css={css`
            margin-top: ${euiTheme.size.m};
            border-top: ${euiTheme.border.thin};
          `}
        >
          <div
            data-test-subj="agenticInvestigationsTimelineExpandedLanes"
            onPointerDown={(event) => {
              // Anywhere but on an event starts a selection.
              if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              const at = fractionAt(event.clientX);
              setDrag({ start: at, end: at });
            }}
            onPointerMove={(event) => {
              if (drag) setDrag({ ...drag, end: fractionAt(event.clientX) });
            }}
            onPointerUp={finishDrag}
            onPointerCancel={() => setDrag(null)}
            css={{
              position: 'relative',
              cursor: drag ? 'col-resize' : 'crosshair',
              // A sideways swipe selects; the page still scrolls up and down.
              touchAction: 'pan-y',
              userSelect: 'none',
            }}
          >
            {/* The highlighted windows, shaded behind every lane. */}
            <div
              css={css`
                position: absolute;
                top: 0;
                bottom: 0;
                left: ${LABEL_WIDTH}px;
                right: 0;
                pointer-events: none;
              `}
              ref={trackRef}
            >
              {drag && (
                <div
                  data-test-subj="agenticInvestigationsTimelineExpandedSelection"
                  css={css`
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    z-index: 4;
                    left: ${pct(Math.min(drag.start, drag.end))};
                    width: ${pct(Math.abs(drag.end - drag.start))};
                    background: ${euiTheme.colors.primary};
                    opacity: 0.15;
                    border-inline: 1px solid ${euiTheme.colors.primary};
                  `}
                />
              )}
              {windows.map(({ label, start, end, tone = 'danger' }) => (
                <div
                  key={`${start}-${end}`}
                  title={label}
                  data-test-subj="agenticInvestigationsTimelineExpandedWindow"
                  css={css`
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    left: ${pct(scale.toX(Date.parse(start)))};
                    width: ${pct(scale.toX(Date.parse(end)) - scale.toX(Date.parse(start)))};
                    background: ${euiTheme.colors[tone]};
                    opacity: 0.1;
                  `}
                />
              ))}
            </div>
            {lanes.map((lane) => (
              <div
                key={lane.id}
                css={css`
                  display: flex;
                  height: ${LANE_HEIGHT}px;
                  border-bottom: ${euiTheme.border.thin};
                  /* The lane of the event being viewed is tinted, to find it among many. */
                  ${lane.events.some(({ id }) => id === selectedId)
                    ? `background: ${euiTheme.colors.backgroundBaseSubdued};`
                    : ''}
                `}
              >
                <div
                  css={css`
                    width: ${LABEL_WIDTH}px;
                    padding-top: ${euiTheme.size.s};
                    flex: 0 0 ${LABEL_WIDTH}px;
                    min-width: 0;
                  `}
                >
                  {lane.id === 'investigation' ? (
                    // What belongs to no entity: nothing to show or open.
                    <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiIcon type={lane.icon} aria-hidden />
                      </EuiFlexItem>
                      <EuiFlexItem css={{ minWidth: 0 }}>
                        <EuiText size="s">{lane.label}</EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  ) : (
                    <EuiPopover
                      isOpen={hoverLaneId === lane.id}
                      closePopover={() => setHoverLaneId(undefined)}
                      anchorPosition="rightUp"
                      panelPaddingSize="m"
                      ownFocus={false}
                      hasArrow
                      display="block"
                      panelProps={{
                        css: css`
                          pointer-events: none;
                          inline-size: 340px;
                          max-inline-size: 90vw;
                        `,
                      }}
                      button={
                        <button
                          type="button"
                          onClick={() => onOpenEntity?.(lane.id)}
                          onMouseEnter={() => setHoverLaneId(lane.id)}
                          onMouseLeave={() => setHoverLaneId(undefined)}
                          onFocus={() => setHoverLaneId(lane.id)}
                          onBlur={() => setHoverLaneId(undefined)}
                          data-test-subj={`agenticInvestigationsTimelineExpandedLane-${lane.id}`}
                          css={css`
                            display: flex;
                            gap: ${euiTheme.size.s};
                            align-items: flex-start;
                            padding: 0;
                            border: none;
                            background: none;
                            color: inherit;
                            font: inherit;
                            text-align: start;
                            cursor: ${onOpenEntity ? 'pointer' : 'default'};
                            &:hover .laneName,
                            &:focus-visible .laneName {
                              text-decoration: underline;
                            }
                          `}
                        >
                          <EuiIcon type={lane.icon} aria-hidden />
                          <EuiText size="s" className="laneName">
                            {lane.label}
                          </EuiText>
                        </button>
                      }
                    >
                      <EntityHoverCard entityId={lane.id} impactMap={impactMap} />
                    </EuiPopover>
                  )}
                </div>
                <div
                  css={css`
                    position: relative;
                    flex: 1 1 auto;
                    &::before {
                      content: '';
                      position: absolute;
                      left: 0;
                      right: 0;
                      top: 50%;
                      border-top: 1px dashed ${euiTheme.colors.borderBasePlain};
                    }
                  `}
                >
                  {lane.events.map((event, index) => {
                    const x = scale.toX(Date.parse(event.at));
                    const endX = event.ends_at ? scale.toX(Date.parse(event.ends_at)) : undefined;
                    // Markers that would sit on one another are set a little apart.
                    // Events that happened at nearly the same time overlap, side by side on the
                    // same line, like a stack of avatars; the line itself stays one line.
                    const stacked = lane.events
                      .slice(0, index)
                      .filter(
                        (other) => Math.abs(scale.toX(Date.parse(other.at)) - x) < 0.02
                      ).length;
                    const nudge = stacked * MARKER_OVERLAP_STEP;
                    return (
                      <React.Fragment key={event.id}>
                        {endX !== undefined && endX > x && (
                          <div
                            css={css`
                              position: absolute;
                              top: calc(50% - 3px);
                              height: 6px;
                              left: ${pct(x)};
                              width: ${pct(endX - x)};
                              background: ${euiTheme.colors.danger};
                              opacity: 0.45;
                            `}
                          />
                        )}
                        <EuiPopover
                          isOpen={hoverId === event.id}
                          closePopover={() => setHoverId(undefined)}
                          anchorPosition="upCenter"
                          panelPaddingSize="m"
                          ownFocus={false}
                          hasArrow
                          // Positioned on the lane as the marker was; the card only shows, so the
                          // pointer passes through it to whatever is under.
                          css={css`
                            position: absolute;
                            top: calc(50% - ${MARKER / 2}px);
                            z-index: ${event.id === selectedId || hoverId === event.id
                              ? 5
                              : 1 + stacked};
                            left: calc(${pct(x)} + ${nudge}px);
                            transform: translateX(-50%);
                            line-height: 0;
                          `}
                          panelProps={{
                            css: css`
                              pointer-events: none;
                              inline-size: 400px;
                              max-inline-size: 90vw;
                              /* The card only shows, so a tall chart is cut off, not scrolled. */
                              max-block-size: 80vh;
                              overflow: hidden;
                            `,
                          }}
                          button={
                            <button
                              type="button"
                              aria-label={event.title}
                              aria-pressed={event.id === selectedId}
                              data-test-subj={`agenticInvestigationsTimelineExpandedEvent-${event.id}`}
                              onMouseEnter={() => setHoverId(event.id)}
                              onMouseLeave={() => setHoverId(undefined)}
                              onFocus={() => setHoverId(event.id)}
                              onBlur={() => setHoverId(undefined)}
                              onClick={() =>
                                setSelectedId(event.id === selectedId ? undefined : event.id)
                              }
                              css={css`
                                padding: 0;
                                border: 2px solid transparent;
                                border-radius: 50%;
                                /* The event being viewed below: a ring with a gap, so it reads on any colour. */
                                ${event.id === selectedId
                                  ? `box-shadow: 0 0 0 2px ${euiTheme.colors.emptyShade}, 0 0 0 5px ${euiTheme.colors.primary};
                                     transform: scale(1.15);`
                                  : ''}
                                background: none;
                                cursor: pointer;
                                line-height: 0;
                              `}
                            >
                              <KindDot kind={event.kind} size="s" quiet />
                            </button>
                          }
                        >
                          <EventHoverCard event={event} impactMap={impactMap} />
                        </EuiPopover>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            ))}
            {chartPoints.length > 0 && (
              <div
                css={css`
                  display: flex;
                  height: 96px;
                  border-bottom: ${euiTheme.border.thin};
                `}
              >
                <EuiFlexGroup
                  gutterSize="s"
                  alignItems="flexStart"
                  responsive={false}
                  css={css`
                    width: ${LABEL_WIDTH}px;
                    padding-top: ${euiTheme.size.s};
                    flex: 0 0 ${LABEL_WIDTH}px;
                  `}
                >
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="visBarVertical" aria-hidden />
                  </EuiFlexItem>
                  <EuiFlexItem css={{ minWidth: 0 }}>
                    {/* Two lines at most, so the label stays inside its lane; the full title is on hover. */}
                    <EuiText
                      size="s"
                      title={chart?.title}
                      css={css`
                        display: -webkit-box;
                        -webkit-line-clamp: 2;
                        -webkit-box-orient: vertical;
                        overflow: hidden;
                      `}
                    >
                      {chart?.title}
                    </EuiText>
                    {chartSeries?.name && (
                      <EuiText size="xs" color="subdued">
                        {chartSeries.name}
                      </EuiText>
                    )}
                  </EuiFlexItem>
                </EuiFlexGroup>
                <div
                  data-test-subj="agenticInvestigationsTimelineExpandedChart"
                  css={{ position: 'relative', flex: '1 1 auto' }}
                >
                  {chartPoints.map(({ ms, y }, index) => {
                    const next =
                      chartPoints[index + 1]?.ms ?? ms + (ms - chartPoints[index - 1].ms);
                    const x = scale.toX(ms);
                    const width = Math.max(scale.toX(next) - x, 0.004);
                    return (
                      <div
                        key={ms}
                        title={`${formatTimelineClock(new Date(ms).toISOString())}: ${y}`}
                        css={css`
                          position: absolute;
                          bottom: 0;
                          left: ${pct(x)};
                          width: calc(${pct(width)} - 2px);
                          height: ${Math.max((y / maxY) * 88, 1)}px;
                          background: ${euiTheme.colors.danger};
                          opacity: 0.6;
                        `}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          {/* The axis: round times, the day where it changes, and a break where a quiet stretch is cut short. */}
          <div
            css={css`
              position: relative;
              height: 44px;
              margin-left: ${LABEL_WIDTH}px;
            `}
          >
            {scale.ticks.map(({ x, label, day }) => (
              <div
                key={`${x}-${label}`}
                css={css`
                  position: absolute;
                  left: ${pct(x)};
                  transform: translateX(-50%);
                  text-align: center;
                  white-space: nowrap;
                `}
              >
                <div
                  css={css`
                    height: 5px;
                    border-left: 1px solid ${euiTheme.colors.borderBaseProminent};
                    margin: 0 auto;
                    width: 0;
                  `}
                />
                <EuiText size="xs" color="subdued">
                  {label}
                </EuiText>
                {day && (
                  <EuiText size="xs" color="subdued">
                    {day}
                  </EuiText>
                )}
              </div>
            ))}
            {scale.breaks.map((x) => (
              <EuiText
                key={x}
                size="xs"
                color="subdued"
                css={css`
                  position: absolute;
                  left: ${pct(x)};
                  top: -6px;
                  transform: translateX(-50%);
                `}
              >
                //
              </EuiText>
            ))}
          </div>
        </div>
      )}

      {shown && (
        // The whole event, as the event flyout shows it.
        <div
          ref={detailRef}
          data-test-subj="agenticInvestigationsTimelineExpandedDetail"
          css={css`
            margin-top: ${euiTheme.size.m};
            padding: ${euiTheme.size.base};
            border: ${euiTheme.border.thin};
            border-radius: ${euiTheme.border.radius.medium};
          `}
        >
          <EuiTitle size="s">
            <h3>{shown.title}</h3>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EventKeyFacts event={shown} impactMap={impactMap} onOpenEntity={onOpenEntity} />
          <EuiSpacer size="m" />
          <EventDetail event={shown} allEvents={events} />
        </div>
      )}
    </div>
  );
};

/**
 * The expanded timeline in a push flyout, over the conversation details like the hypothesis tree:
 * the menu offers Back to the investigation.
 */
export const TimelineExpandedFlyout: React.FC<{
  impactMap: InvestigationImpactMapResponse;
  focus?: TimelineFocus;
  /** Opens the entity's own flyout, as a click on a lane's name does. */
  onOpenEntity?: (entityId: string) => void;
  onClose: () => void;
}> = ({ impactMap, focus = { entityIds: [] }, onOpenEntity, onClose }) => {
  const titleId = useGeneratedHtmlId({ prefix: 'investigationTimelineExpandedTitle' });
  return (
    // Rendered from inside the conversation details flyout, whose transformed body would otherwise
    // contain this fixed-position flyout.
    <EuiPortal>
      <EuiFlyout
        onClose={onClose}
        aria-labelledby={titleId}
        data-test-subj="agenticInvestigationsTimelineExpandedFlyout"
        session="start"
        historyKey={CONVERSATION_DETAILS_FLYOUT_HISTORY_KEY}
        flyoutMenuProps={{ title: TITLE, hideTitle: true }}
        type="push"
        size="l"
        resizable
      >
        <EuiFlyoutHeader>
          <EuiTitle size="s">
            <h2 id={titleId}>{TITLE}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <TimelineExpanded impactMap={impactMap} focus={focus} onOpenEntity={onOpenEntity} />
        </EuiFlyoutBody>
      </EuiFlyout>
    </EuiPortal>
  );
};
