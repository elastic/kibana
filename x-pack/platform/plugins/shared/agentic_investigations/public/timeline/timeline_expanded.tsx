/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
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
  EuiToolTip,
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
import {
  buildTimeScale,
  compareEventsByTime,
  formatTimelineClock,
  selectTimelineSummary,
} from '../../common';
import {
  EVENT_GROUPS,
  EventAffects,
  EventDetail,
  EventKeyFacts,
  eventAffectsAnything,
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
import { getTrendTone, pickTrendSeries } from './trend';
import { EntityHoverCard } from './entity_hover_card';

/** The exact time under the pointer, to the second, in UTC: `11-25 11:51:21 UTC`. */
const formatPointerTime = (ms: number): string => {
  const iso = new Date(ms).toISOString();
  return `${iso.slice(5, 10)} ${iso.slice(11, 19)} UTC`;
};

/** The trend an event carries: its series that matters, as points in time, and whether it is good or bad. */
const getTrend = (event: ImpactMapEvent) => {
  const chart = event.evidence?.chart;
  const series = pickTrendSeries(event.kind, chart?.series);
  const points = (series?.points ?? [])
    .map(({ x, y }) => ({ ms: Date.parse(x), y }))
    .filter(({ ms }) => !Number.isNaN(ms))
    .sort((a, b) => a.ms - b.ms);
  return {
    title: chart?.title,
    seriesName: series?.name,
    points,
    tone: getTrendTone(event.kind, series?.name),
  };
};

const TRENDS = i18n.translate('xpack.agenticInvestigations.timelineExpanded.trends', {
  defaultMessage: 'Trends from events',
});
const ADD_TREND = i18n.translate('xpack.agenticInvestigations.timelineExpanded.addTrend', {
  defaultMessage: 'Add trend',
});
const ADD_TO_TRENDS = i18n.translate('xpack.agenticInvestigations.timelineExpanded.addToTrends', {
  defaultMessage: 'Add to trends',
});
const SEARCH_TRENDS = i18n.translate('xpack.agenticInvestigations.timelineExpanded.searchTrends', {
  defaultMessage: 'Search events with a trend',
});
const NO_TRENDS = i18n.translate('xpack.agenticInvestigations.timelineExpanded.noTrends', {
  defaultMessage: 'No events with a trend match',
});
const CLOSE_EVENT = i18n.translate('xpack.agenticInvestigations.timelineExpanded.closeEvent', {
  defaultMessage: 'Close event',
});
const VIEW_EVENT_DATA = i18n.translate(
  'xpack.agenticInvestigations.timelineExpanded.viewEventData',
  {
    defaultMessage: 'View event data',
  }
);
const FILTER_FOR = (value: string) =>
  i18n.translate('xpack.agenticInvestigations.timelineExpanded.filterFor', {
    defaultMessage: 'Filter for {value}',
    values: { value },
  });
const FILTER_OUT = (value: string) =>
  i18n.translate('xpack.agenticInvestigations.timelineExpanded.filterOut', {
    defaultMessage: 'Filter out {value}',
    values: { value },
  });
const REMOVE_FILTER = i18n.translate('xpack.agenticInvestigations.timelineExpanded.removeFilter', {
  defaultMessage: 'Remove filter',
});
const MODIFY_TRENDS = i18n.translate('xpack.agenticInvestigations.timelineExpanded.modifyTrends', {
  defaultMessage: 'Modify trends',
});
const REMOVE_TREND = i18n.translate('xpack.agenticInvestigations.timelineExpanded.removeTrend', {
  defaultMessage: 'Remove trend',
});
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
  const windows = useMemo(() => summary?.windows ?? [], [summary]);
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
  // A card with something to click stays open a moment after the pointer leaves the marker, so the
  // pointer can cross to it.
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>();
  const showHover = (id: string) => {
    clearTimeout(hoverTimer.current);
    setHoverId(id);
  };
  const hideHover = (delay = 0) => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHoverId(undefined), delay);
  };
  useEffect(() => () => clearTimeout(hoverTimer.current), []);
  const [hoverLaneId, setHoverLaneId] = useState<string>();
  // The events whose trends are drawn under the lanes; absent, the one the agent picked.
  const [trendIds, setTrendIds] = useState<string[]>();
  const [isTrendPickerOpen, setIsTrendPickerOpen] = useState(false);
  // What narrows the events the picker offers: typed text, entities and types.
  const [pickerText, setPickerText] = useState('');
  const [pickerEntities, setPickerEntities] = useState<string[]>([]);
  const [pickerKinds, setPickerKinds] = useState<string[]>([]);
  // The time range dragged out on the lanes. Absent, every event is in view.
  const [range, setRange] = useState<{ from: number; to: number } | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ start: number; end: number } | null>(null);
  // What is filtered out, beside what is filtered in: Kibana's "filter for" and "filter out".
  const [entityExclude, setEntityExclude] = useState<string[]>([]);
  const [kindExclude, setKindExclude] = useState<string[]>([]);
  const [legendMenuKind, setLegendMenuKind] = useState<string>();
  const hoverLineRef = useRef<HTMLDivElement>(null);
  const hoverTimeRef = useRef<HTMLSpanElement>(null);
  const isFiltered =
    entityFilter.length > 0 ||
    kindFilter.length > 0 ||
    entityExclude.length > 0 ||
    kindExclude.length > 0 ||
    text.trim() !== '';
  const clearFilters = () => {
    setEntityFilter([]);
    setKindFilter([]);
    setEntityExclude([]);
    setKindExclude([]);
    setText('');
  };

  const matches = (
    event: ImpactMapEvent,
    { entityIds, kinds, search }: { entityIds?: string[]; kinds?: string[]; search?: string }
  ) => {
    if (kinds?.length && !kinds.includes(event.kind)) return false;
    if (kindExclude.includes(event.kind)) return false;
    if (
      entityExclude.length > 0 &&
      getEventEntityIds(event, relationships).some((id) => entityExclude.includes(id))
    ) {
      return false;
    }
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
        .sort(compareEventsByTime),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, entityFilter, kindFilter, entityExclude, kindExclude, text, range]
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
  }, [
    events,
    entities,
    entityTypes,
    relationships,
    kindFilter,
    entityFilter,
    entityExclude,
    kindExclude,
    text,
  ]);

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
    })).filter(
      ({ key, count }) => count > 0 || kindFilter.includes(key) || kindExclude.includes(key)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, entityFilter, kindFilter, entityExclude, kindExclude, text]);

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

  // Every event that carries a trend can be drawn as a row under the lanes.
  const trendEvents = useMemo(
    () => events.filter((event) => getTrend(event).points.length >= 2),
    [events]
  );
  const defaultTrendId = summary?.chartEvent?.id;
  // Whenever the timeline opens, the trends that tell the story are drawn: every customer impact,
  // root cause and recovery that has one, and the event the agent picked for the chart, in the
  // order the events happened.
  const shownTrendIds =
    trendIds ??
    trendEvents
      .filter(
        ({ id, kind }) =>
          id === defaultTrendId ||
          kind === 'customer_impact' ||
          kind === 'root_cause' ||
          kind === 'recovery'
      )
      .map(({ id }) => id);
  const trends = useMemo(
    () =>
      shownTrendIds.flatMap((id) => {
        const event = trendEvents.find((candidate) => candidate.id === id);
        if (!event) return [];
        const { title, seriesName, points, tone } = getTrend(event);
        const inRange = range
          ? points.filter(
              ({ ms }, index) => ms <= range.to && (points[index + 1]?.ms ?? ms) >= range.from
            )
          : points;
        return inRange.length >= 2
          ? [
              {
                event,
                title,
                seriesName,
                tone,
                points: inRange,
                maxY: Math.max(...inRange.map(({ y }) => y), 1),
              },
            ]
          : [];
      }),
    // shownTrendIds is derived from trendIds and the summary
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trendEvents, trendIds, defaultTrendId, range]
  );

  const pickerEvents = useMemo(() => {
    const needle = pickerText.trim().toLowerCase();
    return trendEvents.filter(
      (event) =>
        (pickerKinds.length === 0 || pickerKinds.includes(event.kind)) &&
        (pickerEntities.length === 0 ||
          getEventEntityIds(event, relationships).some((id) => pickerEntities.includes(id))) &&
        (needle === '' ||
          `${event.title} ${getTrend(event).title ?? ''}`.toLowerCase().includes(needle))
    );
  }, [trendEvents, pickerText, pickerKinds, pickerEntities, relationships]);
  const pickerEntityOptions = useMemo<FilterOption[]>(() => {
    const types = new Map(entityTypes.map((type) => [type.id, type]));
    const counts = new Map<string, number>();
    trendEvents.forEach((event) =>
      getEventEntityIds(event, relationships).forEach((id) =>
        counts.set(id, (counts.get(id) ?? 0) + 1)
      )
    );
    return entities
      .filter(({ id }) => counts.has(id))
      .map(({ id, label, type_id: typeId }) => ({
        key: id,
        label,
        count: counts.get(id) ?? 0,
        icon: getEntityIcon(types.get(typeId)),
      }));
  }, [trendEvents, entities, entityTypes, relationships]);
  const pickerKindOptions = useMemo<FilterOption[]>(
    () =>
      EVENT_GROUPS.map(({ id, label, icon, color }) => ({
        key: id,
        label,
        iconColor: color,
        icon,
        count: trendEvents.filter(({ kind }) => kind === id).length,
      })).filter(({ count }) => count > 0),
    [trendEvents]
  );

  const toggleTrend = (id: string) =>
    setTrendIds(
      shownTrendIds.includes(id)
        ? shownTrendIds.filter((shown) => shown !== id)
        : [...shownTrendIds, id]
    );
  const trendEventIds = useMemo(() => new Set(trendEvents.map(({ id }) => id)), [trendEvents]);

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
            ...trends.flatMap(({ points }) => points.map(({ ms }) => ms)),
          ]),
    [range, visible, windows, trends]
  );

  const shown = events.find(({ id }) => id === selectedId);
  // Choosing an event brings its detail into view, below the lanes.
  useEffect(() => {
    if (selectedId) detailRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedId]);
  const first = visible[0] && Date.parse(visible[0].at);
  const last = visible[visible.length - 1] && Date.parse(visible[visible.length - 1].at);
  const pct = (value: number) => `${(value * 100).toFixed(3)}%`;

  const toggleIn = (list: string[], setList: (next: string[]) => void, id: string) =>
    setList(list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);
  /** Filter for or out of a value: choosing one takes it out of the other. */
  const filterEntity = (id: string, mode: 'for' | 'out') => {
    if (mode === 'for') {
      setEntityExclude(entityExclude.filter((item) => item !== id));
      toggleIn(entityFilter, setEntityFilter, id);
    } else {
      setEntityFilter(entityFilter.filter((item) => item !== id));
      toggleIn(entityExclude, setEntityExclude, id);
    }
  };
  const filterKind = (kind: string, mode: 'for' | 'out') => {
    if (mode === 'for') {
      setKindExclude(kindExclude.filter((item) => item !== kind));
      toggleIn(kindFilter, setKindFilter, kind);
    } else {
      setKindFilter(kindFilter.filter((item) => item !== kind));
      toggleIn(kindExclude, setKindExclude, kind);
    }
  };
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
        {/* What is filtered out, to put back: its lane or type is not on the timeline to click. */}
        {[
          ...entityExclude.map((id) => ({
            key: `entity:${id}`,
            label: entities.find((entity) => entity.id === id)?.label ?? id,
            remove: () => setEntityExclude(entityExclude.filter((item) => item !== id)),
          })),
          ...kindExclude.map((kind) => ({
            key: `kind:${kind}`,
            label: EVENT_GROUPS.find(({ id }) => id === kind)?.label ?? kind,
            remove: () => setKindExclude(kindExclude.filter((item) => item !== kind)),
          })),
        ].map(({ key, label, remove }) => (
          <EuiFlexItem grow={false} key={key}>
            <EuiBadge
              color="hollow"
              iconType="minusCircle"
              iconSide="left"
              onClick={remove}
              onClickAriaLabel={REMOVE_FILTER}
              iconOnClick={remove}
              iconOnClickAriaLabel={REMOVE_FILTER}
              data-test-subj="agenticInvestigationsTimelineExpandedExcluded"
            >
              {label}
            </EuiBadge>
          </EuiFlexItem>
        ))}
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
              const isExcluded = kindExclude.includes(key);
              const isDimmed = (kindFilter.length > 0 && !isSelected) || isExcluded;
              return (
                <EuiFlexItem key={key} grow={false}>
                  {/* A click offers to filter for the type or out of it, as Kibana does for a value. */}
                  <EuiPopover
                    isOpen={legendMenuKind === key}
                    closePopover={() => setLegendMenuKind(undefined)}
                    anchorPosition="downLeft"
                    panelPaddingSize="none"
                    button={
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        aria-haspopup="menu"
                        onClick={() => setLegendMenuKind(legendMenuKind === key ? undefined : key)}
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
                        <EuiText
                          size="s"
                          component="span"
                          css={{ textDecoration: isExcluded ? 'line-through' : 'none' }}
                        >
                          {isExcluded ? label : `${label} ${count}`}
                        </EuiText>
                      </button>
                    }
                  >
                    <EuiContextMenuPanel
                      items={[
                        <EuiContextMenuItem
                          key="for"
                          icon={isSelected ? 'check' : 'plusCircle'}
                          onClick={() => {
                            filterKind(key, 'for');
                            setLegendMenuKind(undefined);
                          }}
                          data-test-subj={`agenticInvestigationsTimelineExpandedLegendFor-${key}`}
                        >
                          {FILTER_FOR(label)}
                        </EuiContextMenuItem>,
                        <EuiContextMenuItem
                          key="out"
                          icon={isExcluded ? 'check' : 'minusCircle'}
                          onClick={() => {
                            filterKind(key, 'out');
                            setLegendMenuKind(undefined);
                          }}
                          data-test-subj={`agenticInvestigationsTimelineExpandedLegendOut-${key}`}
                        >
                          {FILTER_OUT(label)}
                        </EuiContextMenuItem>,
                      ]}
                    />
                  </EuiPopover>
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
              // Anywhere on the lanes but on an event or a control starts a selection. Not what is
              // in a popover (it bubbles here through React, not through the page), and not the
              // trend picker, whose list and search need their own clicks.
              const target = event.target as HTMLElement;
              if (
                event.button !== 0 ||
                !event.currentTarget.contains(target) ||
                target.closest('button, input, [role="option"], [data-no-drag]')
              ) {
                return;
              }
              event.currentTarget.setPointerCapture(event.pointerId);
              const at = fractionAt(event.clientX);
              setDrag({ start: at, end: at });
            }}
            onPointerMove={(event) => {
              if (drag) setDrag({ ...drag, end: fractionAt(event.clientX) });
              // The hover line follows the pointer without a render: it moves every few pixels.
              const box = trackRef.current?.getBoundingClientRect();
              const line = hoverLineRef.current;
              const time = hoverTimeRef.current;
              if (!box || !line || !time || box.width <= 0) return;
              const fraction = (event.clientX - box.left) / box.width;
              if (!(fraction >= 0 && fraction <= 1)) {
                line.style.display = 'none';
                return;
              }
              line.style.display = 'block';
              line.style.left = `${fraction * 100}%`;
              time.textContent = formatPointerTime(scale.toMs(fraction));
              // Near an edge the time sits to the inside, so it is not cut off.
              time.style.transform =
                fraction > 0.85
                  ? 'translateX(-100%)'
                  : fraction < 0.15
                  ? 'none'
                  : 'translateX(-50%)';
            }}
            onPointerLeave={() => {
              if (hoverLineRef.current) hoverLineRef.current.style.display = 'none';
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
              <div
                ref={hoverLineRef}
                data-test-subj="agenticInvestigationsTimelineExpandedHoverLine"
                css={css`
                  display: none;
                  position: absolute;
                  top: 0;
                  bottom: 0;
                  z-index: 6;
                  border-inline-start: 1px solid ${euiTheme.colors.darkestShade};
                  pointer-events: none;
                `}
              >
                {/* The exact time under the pointer, at the top of the line. */}
                <span
                  ref={hoverTimeRef}
                  data-test-subj="agenticInvestigationsTimelineExpandedHoverTime"
                  css={css`
                    position: absolute;
                    top: 0;
                    white-space: nowrap;
                    padding: 0 ${euiTheme.size.xs};
                    border-radius: ${euiTheme.border.radius.small};
                    background: ${euiTheme.colors.darkestShade};
                    color: ${euiTheme.colors.emptyShade};
                    font-size: ${euiTheme.size.m};
                    line-height: ${euiTheme.size.l};
                  `}
                />
              </div>
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
                  &:hover .laneActions,
                  &:focus-within .laneActions {
                    opacity: 1;
                  }
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
                    position: relative;
                  `}
                >
                  {lane.id !== 'investigation' && (
                    // Filter for or out of this entity, shown on hover as Kibana shows them on a value.
                    <div
                      className="laneActions"
                      css={css`
                        position: absolute;
                        top: ${euiTheme.size.xs};
                        right: ${euiTheme.size.xs};
                        z-index: 2;
                        display: flex;
                        /* Over the name, only while the lane is hovered, so it takes no room of its own. */
                        background: ${euiTheme.colors.backgroundBasePlain};
                        border-radius: ${euiTheme.border.radius.medium};
                        box-shadow: 0 0 0 1px ${euiTheme.colors.borderBasePlain};
                        opacity: 0;
                        &:focus-within {
                          opacity: 1;
                        }
                      `}
                    >
                      <EuiToolTip content={FILTER_FOR(lane.label)} disableScreenReaderOutput>
                        <EuiButtonIcon
                          iconType="plusCircle"
                          size="xs"
                          color="text"
                          aria-label={FILTER_FOR(lane.label)}
                          onClick={() => filterEntity(lane.id, 'for')}
                          data-test-subj={`agenticInvestigationsTimelineExpandedLaneFor-${lane.id}`}
                        />
                      </EuiToolTip>
                      <EuiToolTip content={FILTER_OUT(lane.label)} disableScreenReaderOutput>
                        <EuiButtonIcon
                          iconType="minusCircle"
                          size="xs"
                          color="text"
                          aria-label={FILTER_OUT(lane.label)}
                          onClick={() => filterEntity(lane.id, 'out')}
                          data-test-subj={`agenticInvestigationsTimelineExpandedLaneOut-${lane.id}`}
                        />
                      </EuiToolTip>
                    </div>
                  )}
                  {lane.id === 'investigation' ? (
                    // What belongs to no entity: nothing to show or open.
                    <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiIcon type={lane.icon} aria-hidden />
                      </EuiFlexItem>
                      <EuiFlexItem css={{ minWidth: 0 }}>
                        <EuiText
                          size="s"
                          css={css`
                            display: -webkit-box;
                            -webkit-line-clamp: 2;
                            -webkit-box-orient: vertical;
                            overflow: hidden;
                          `}
                        >
                          {lane.label}
                        </EuiText>
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
                            max-width: 100%;
                            min-width: 0;
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
                          <EuiText
                            size="s"
                            className="laneName"
                            css={css`
                              /* Two lines at most, so a long name stays inside its lane. */
                              display: -webkit-box;
                              -webkit-line-clamp: 2;
                              -webkit-box-orient: vertical;
                              overflow: hidden;
                              overflow-wrap: anywhere;
                              min-width: 0;
                            `}
                          >
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
                          closePopover={() => hideHover()}
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
                              /* Only a card with a button to click takes the pointer. */
                              pointer-events: ${trendEventIds.has(event.id) ? 'auto' : 'none'};
                              inline-size: 400px;
                              max-inline-size: 90vw;
                              /* A tall chart is cut off, not scrolled. */
                              max-block-size: 80vh;
                              overflow: hidden;
                            `,
                            onMouseEnter: () => showHover(event.id),
                            onMouseLeave: () => hideHover(150),
                          }}
                          button={
                            <button
                              type="button"
                              aria-label={event.title}
                              aria-pressed={event.id === selectedId}
                              data-test-subj={`agenticInvestigationsTimelineExpandedEvent-${event.id}`}
                              onMouseEnter={() => showHover(event.id)}
                              onMouseLeave={() => hideHover(trendEventIds.has(event.id) ? 150 : 0)}
                              onFocus={() => showHover(event.id)}
                              onBlur={() => hideHover()}
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
                          <EventHoverCard
                            event={event}
                            impactMap={impactMap}
                            action={
                              trendEventIds.has(event.id) ? (
                                <EuiButtonEmpty
                                  size="xs"
                                  flush="left"
                                  iconType={
                                    shownTrendIds.includes(event.id) ? 'minusCircle' : 'plusCircle'
                                  }
                                  onClick={() => toggleTrend(event.id)}
                                  data-test-subj="agenticInvestigationsTimelineExpandedToggleTrend"
                                >
                                  {shownTrendIds.includes(event.id) ? REMOVE_TREND : ADD_TO_TRENDS}
                                </EuiButtonEmpty>
                              ) : undefined
                            }
                          />
                        </EuiPopover>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            ))}
            {trendEvents.length > 0 && (
              <>
                <div
                  data-test-subj="agenticInvestigationsTimelineExpandedTrends"
                  data-no-drag
                  css={css`
                    display: flex;
                    align-items: center;
                    gap: ${euiTheme.size.s};
                    min-height: 40px;
                    border-top: 2px solid ${euiTheme.colors.borderBaseProminent};
                    border-bottom: ${euiTheme.border.thin};
                    background: ${euiTheme.colors.backgroundBaseSubdued};
                    padding-inline-start: ${euiTheme.size.xs};
                  `}
                >
                  <EuiIcon type="visLine" color="subdued" aria-hidden />
                  <EuiText size="xs" color="subdued">
                    <strong>{TRENDS}</strong>
                  </EuiText>
                  <EuiPopover
                    isOpen={isTrendPickerOpen}
                    closePopover={() => setIsTrendPickerOpen(false)}
                    anchorPosition="downLeft"
                    panelPaddingSize="none"
                    // Its filters are popovers too: a focus trap would stop them taking clicks.
                    ownFocus={false}
                    panelProps={{
                      'data-test-subj': 'agenticInvestigationsTimelineExpandedTrendPicker',
                    }}
                    button={
                      <EuiButtonEmpty
                        size="xs"
                        iconType={shownTrendIds.length === 0 ? 'plusCircle' : 'pencil'}
                        onClick={() => setIsTrendPickerOpen((open) => !open)}
                        data-test-subj="agenticInvestigationsTimelineExpandedAddTrend"
                      >
                        {/* "Add trend" while there are none; "Modify trends" once there are. */}
                        {shownTrendIds.length === 0 ? ADD_TREND : MODIFY_TRENDS}
                      </EuiButtonEmpty>
                    }
                  >
                    <div css={{ inlineSize: 540, maxInlineSize: '90vw' }}>
                      <div>
                        {/* Type to narrow by name; the two filters narrow by type and by entity. */}
                        <EuiFlexGroup
                          gutterSize="s"
                          alignItems="center"
                          responsive={false}
                          css={{ padding: euiTheme.size.s }}
                        >
                          <EuiFlexItem>
                            <EuiFieldSearch
                              compressed
                              autoFocus
                              value={pickerText}
                              onChange={(event) => setPickerText(event.target.value)}
                              placeholder={SEARCH_TRENDS}
                              aria-label={SEARCH_TRENDS}
                              data-test-subj="agenticInvestigationsTimelineExpandedTrendSearch"
                            />
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <EuiFilterGroup compressed>
                              <FilterPopover
                                label={ENTITY}
                                options={pickerEntityOptions}
                                selected={pickerEntities}
                                onChange={setPickerEntities}
                                searchable
                                searchPlaceholder={SEARCH_ENTITIES}
                                testSubj="agenticInvestigationsTimelineExpandedTrendEntityFilter"
                              />
                              <FilterPopover
                                label={TYPE}
                                options={pickerKindOptions}
                                selected={pickerKinds}
                                onChange={setPickerKinds}
                                testSubj="agenticInvestigationsTimelineExpandedTrendTypeFilter"
                              />
                            </EuiFilterGroup>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                        <EuiContextMenuPanel
                          css={{ maxBlockSize: 320, overflowY: 'auto' }}
                          items={pickerEvents.map((event) => (
                            <EuiContextMenuItem
                              key={event.id}
                              onClick={() => toggleTrend(event.id)}
                              data-test-subj={`agenticInvestigationsTimelineExpandedTrendOption-${event.id}`}
                            >
                              {/* The event's own icon says what kind it is; a tick says it is drawn. */}
                              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                                <EuiFlexItem grow={false}>
                                  <KindDot kind={event.kind} size="s" quiet />
                                </EuiFlexItem>
                                <EuiFlexItem css={{ minWidth: 0 }}>
                                  <EuiText size="s">{event.title}</EuiText>
                                  <EuiText size="xs" color="subdued">
                                    {getTrend(event).title}
                                  </EuiText>
                                </EuiFlexItem>
                                <EuiFlexItem grow={false}>
                                  <EuiIcon
                                    type="check"
                                    color="primary"
                                    aria-hidden
                                    css={{
                                      visibility: shownTrendIds.includes(event.id)
                                        ? 'visible'
                                        : 'hidden',
                                    }}
                                  />
                                </EuiFlexItem>
                              </EuiFlexGroup>
                            </EuiContextMenuItem>
                          ))}
                        />
                        {pickerEvents.length === 0 && (
                          <EuiText size="s" color="subdued" css={{ padding: euiTheme.size.m }}>
                            {NO_TRENDS}
                          </EuiText>
                        )}
                      </div>
                    </div>
                  </EuiPopover>
                </div>
              </>
            )}
            {trends.map(({ event, title, seriesName, tone, points, maxY }) => (
              <div
                key={event.id}
                data-test-subj={`agenticInvestigationsTimelineExpandedTrend-${event.id}`}
                css={css`
                  display: flex;
                  /* Tall enough for the label (title, entity, series), growing if it needs more. */
                  min-height: 112px;
                  border-bottom: ${euiTheme.border.thin};
                  ${event.id === selectedId
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
                  <EuiFlexGroup gutterSize="xs" alignItems="flexStart" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <KindDot kind={event.kind} size="s" quiet />
                    </EuiFlexItem>
                    <EuiFlexItem css={{ minWidth: 0 }}>
                      {/* The trend belongs to an event: its title names it, and a click opens it below. */}
                      <EuiPopover
                        isOpen={hoverId === `trend:${event.id}`}
                        closePopover={() => hideHover()}
                        anchorPosition="rightUp"
                        panelPaddingSize="m"
                        ownFocus={false}
                        hasArrow
                        display="block"
                        panelProps={{
                          css: css`
                            pointer-events: none;
                            inline-size: 400px;
                            max-inline-size: 90vw;
                            max-block-size: 80vh;
                            overflow: hidden;
                          `,
                        }}
                        button={
                          <button
                            type="button"
                            onMouseEnter={() => showHover(`trend:${event.id}`)}
                            onMouseLeave={() => hideHover()}
                            onFocus={() => showHover(`trend:${event.id}`)}
                            onBlur={() => hideHover()}
                            onClick={() =>
                              setSelectedId(event.id === selectedId ? undefined : event.id)
                            }
                            title={event.title}
                            css={css`
                              padding: 0;
                              border: none;
                              background: none;
                              color: inherit;
                              font: inherit;
                              text-align: start;
                              cursor: pointer;
                              &:hover {
                                text-decoration: underline;
                              }
                            `}
                          >
                            <EuiText
                              size="s"
                              css={css`
                                display: -webkit-box;
                                -webkit-line-clamp: 2;
                                -webkit-box-orient: vertical;
                                overflow: hidden;
                              `}
                            >
                              {event.title}
                            </EuiText>
                          </button>
                        }
                      >
                        <EventHoverCard event={event} impactMap={impactMap} />
                      </EuiPopover>
                      {/* What the trend is about, where the event says: the entity, to open it. */}
                      {eventAffectsAnything(event, impactMap) && (
                        <div css={{ marginBlock: euiTheme.size.xxs }}>
                          <EventAffects
                            event={event}
                            impactMap={impactMap}
                            onOpenEntity={onOpenEntity}
                          />
                        </div>
                      )}
                      <EuiText
                        size="xs"
                        color="subdued"
                        title={seriesName ?? title}
                        css={css`
                          /* One line, so it never runs into the next trend. */
                          overflow: hidden;
                          text-overflow: ellipsis;
                          white-space: nowrap;
                        `}
                      >
                        {seriesName ?? title}
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        iconType="cross"
                        size="xs"
                        color="text"
                        aria-label={REMOVE_TREND}
                        onClick={() => setTrendIds(shownTrendIds.filter((id) => id !== event.id))}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </div>
                <div
                  data-test-subj="agenticInvestigationsTimelineExpandedChart"
                  css={{ position: 'relative', flex: '1 1 auto' }}
                >
                  {points.map(({ ms, y }, index) => {
                    const next = points[index + 1]?.ms ?? ms + (ms - points[index - 1].ms);
                    const x = scale.toX(ms);
                    const width = Math.max(scale.toX(next) - x, 0.004);
                    return (
                      <EuiToolTip
                        key={ms}
                        position="top"
                        content={
                          <>
                            <div>{VIEW_EVENT_DATA}</div>
                            <div>{`${formatTimelineClock(new Date(ms).toISOString())}: ${y}`}</div>
                          </>
                        }
                        // The anchor is the bar's box, placed on the chart as the bar was.
                        anchorProps={{
                          css: css`
                            position: absolute;
                            bottom: 0;
                            left: ${pct(x)};
                            width: calc(${pct(width)} - 2px);
                            height: ${Math.max((y / maxY) * 100, 1)}px;
                          `,
                        }}
                      >
                        {/* A click on the trend opens the event it belongs to, below. */}
                        <button
                          type="button"
                          aria-label={VIEW_EVENT_DATA}
                          data-test-subj="agenticInvestigationsTimelineExpandedTrendBar"
                          data-tone={tone}
                          onClick={() => setSelectedId(event.id)}
                          css={css`
                            display: block;
                            width: 100%;
                            height: 100%;
                            padding: 0;
                            border: none;
                            cursor: pointer;
                            /* Bad is red, good is green: a number that should go up is not red. */
                            background: ${tone === 'good'
                              ? euiTheme.colors.success
                              : tone === 'bad'
                              ? euiTheme.colors.danger
                              : euiTheme.colors.primary};
                            opacity: 0.6;
                            &:hover {
                              opacity: 0.9;
                            }
                          `}
                        />
                      </EuiToolTip>
                    );
                  })}
                </div>
              </div>
            ))}
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
            position: relative;
          `}
        >
          <EuiButtonIcon
            iconType="cross"
            color="text"
            aria-label={CLOSE_EVENT}
            onClick={() => setSelectedId(undefined)}
            data-test-subj="agenticInvestigationsTimelineExpandedDetailClose"
            css={css`
              position: absolute;
              top: ${euiTheme.size.s};
              right: ${euiTheme.size.s};
            `}
          />
          <EuiTitle size="s">
            {/* Room on the right for the close button. */}
            <h3 css={{ paddingInlineEnd: euiTheme.size.xl }}>{shown.title}</h3>
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
