/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTimeline,
  EuiTimelineItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { TimelineSlotRenderProps } from '@kbn/agentic-investigations-common';
import { useIsInAgentBuilder } from './use_is_in_agent_builder';
import { FilterPopover, type FilterOption } from './event_filter_popover';
import { takeTimelineEventFocus, takeTimelineFocus } from './timeline_focus';
import type { ImpactMapEvent, InvestigationImpactMapResponse } from '../../../../../common';
import { useInvestigation } from '../../../../investigations/hooks/use_investigation';
import {
  EVENT_GROUPS,
  ImpactMapEventsFlyout,
  describeEventTarget,
  getEntityIcon,
  getEntityTypeLabel,
  getEventEntityIds,
  resolveEventsSelection,
} from './impact_map_events';
import { KindAvatar, TimelineEvent, formatDuration } from './timeline_event';

const EMPTY_TITLE = i18n.translate('xpack.agenticInvestigations.timeline.emptyTitle', {
  defaultMessage: 'Nothing on the timeline yet',
});
const EMPTY_BODY = i18n.translate('xpack.agenticInvestigations.timeline.emptyBody', {
  defaultMessage:
    'Changes, failures, alerts and what responders did appear here in the order they happened.',
});
const NO_MATCHES = i18n.translate('xpack.agenticInvestigations.timeline.noMatches', {
  defaultMessage: 'No events match these filters',
});
const CLEAR_FILTERS = i18n.translate('xpack.agenticInvestigations.timeline.clearFilters', {
  defaultMessage: 'Clear filters',
});
const SEARCH_PLACEHOLDER = i18n.translate('xpack.agenticInvestigations.timeline.search', {
  defaultMessage: 'Search events',
});
const ENTITY_FILTER = i18n.translate('xpack.agenticInvestigations.timeline.entityFilter', {
  defaultMessage: 'Entity',
});
const TYPE_FILTER = i18n.translate('xpack.agenticInvestigations.timeline.typeFilter', {
  defaultMessage: 'Type',
});
const SEARCH_ENTITIES = i18n.translate('xpack.agenticInvestigations.timeline.searchEntities', {
  defaultMessage: 'Search entities',
});
const NEWEST_FIRST = i18n.translate('xpack.agenticInvestigations.timeline.newestFirst', {
  defaultMessage: 'Newest first',
});
const OLDEST_FIRST = i18n.translate('xpack.agenticInvestigations.timeline.oldestFirst', {
  defaultMessage: 'Oldest first',
});
const TIMELINE_LABEL = i18n.translate('xpack.agenticInvestigations.timeline.label', {
  defaultMessage: 'Investigation timeline',
});

/**
 * The Timeline tab: every event of the investigation, including findings and responder actions,
 * with search, entity and type filters. An event opens its detail over the investigation flyout.
 */
export const TimelineTab: React.FC<TimelineSlotRenderProps & { embedded?: boolean }> = ({
  conversationId,
  embedded = false,
}) => {
  const { data, isLoading } = useInvestigation(conversationId);

  if (isLoading) {
    return <EuiSkeletonText lines={4} />;
  }

  const impactMap = data?.impact_map;
  if (!impactMap || impactMap.events.length === 0) {
    return (
      <EuiEmptyPrompt
        data-test-subj="agenticInvestigationsTimelineEmpty"
        iconType="clock"
        title={<h3>{EMPTY_TITLE}</h3>}
        titleSize="xs"
        body={<p>{EMPTY_BODY}</p>}
      />
    );
  }

  return <Timeline impactMap={impactMap} conversationId={conversationId} embedded={embedded} />;
};

const Timeline: React.FC<{
  impactMap: InvestigationImpactMapResponse;
  conversationId: string;
  embedded: boolean;
}> = ({ impactMap, conversationId, embedded }) => {
  const isInAgentBuilder = useIsInAgentBuilder();
  // Opened from the map's "View in timeline", it starts filtered by that entity.
  const [entityFilter, setEntityFilter] = useState<string[]>(() =>
    takeTimelineFocus(conversationId)
  );
  const [kindFilter, setKindFilter] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [newestFirst, setNewestFirst] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();
  // Opened from an event's "View in investigation timeline": the event is marked and scrolled to
  // without opening it again.
  const [markedId] = useState(() => takeTimelineEventFocus(conversationId));
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!markedId) return;
    const row = Array.from(
      containerRef.current?.querySelectorAll<HTMLElement>('[data-event-id]') ?? []
    ).find((element) => element.dataset.eventId === markedId);
    row?.scrollIntoView({ block: 'center' });
  }, [markedId]);
  const { events, entities, relationships } = impactMap;

  // Each filter's choices are counted over the events the other filters leave, so the numbers
  // always say what choosing that option would show.
  const matches = useCallback(
    (
      event: ImpactMapEvent,
      { entityIds, kinds, search }: { entityIds?: string[]; kinds?: string[]; search?: string }
    ) => {
      if (kinds?.length && !kinds.includes(event.kind)) {
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
        [event.title, event.description ?? '', describeEventTarget(event, impactMap)].some(
          (value) => value.toLowerCase().includes(needle)
        )
      );
    },
    [relationships, impactMap]
  );

  const entityOptions = useMemo<FilterOption[]>(() => {
    const counts = new Map<string, number>();
    events
      .filter((event) => matches(event, { kinds: kindFilter, search: text }))
      .forEach((event) =>
        getEventEntityIds(event, relationships).forEach((id) =>
          counts.set(id, (counts.get(id) ?? 0) + 1)
        )
      );
    const everTouched = new Set(events.flatMap((event) => getEventEntityIds(event, relationships)));
    const types = new Map(impactMap.entity_types.map((type) => [type.id, type]));
    return entities
      .filter(({ id }) => everTouched.has(id) && (counts.has(id) || entityFilter.includes(id)))
      .map(({ id, label, type_id: typeId }) => ({
        key: id,
        label,
        count: counts.get(id) ?? 0,
        icon: getEntityIcon(types.get(typeId)),
        type: getEntityTypeLabel(types.get(typeId), label),
      }));
  }, [
    events,
    entities,
    relationships,
    impactMap.entity_types,
    matches,
    kindFilter,
    entityFilter,
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
    })).filter(({ key, count }) => count > 0 || kindFilter.includes(key));
  }, [events, matches, entityFilter, kindFilter, text]);

  const isFiltered = entityFilter.length > 0 || kindFilter.length > 0 || text.trim() !== '';

  const visible = useMemo(() => {
    const filtered = events.filter((event) =>
      matches(event, { entityIds: entityFilter, kinds: kindFilter, search: text })
    );
    return newestFirst ? [...filtered].reverse() : filtered;
  }, [events, matches, entityFilter, kindFilter, text, newestFirst]);

  // Runs of events the filters hide, so the list shows where it skips. Each count sits between
  // the two visible events it separates, and at either end when events lie beyond the last one.
  const rows = useMemo(() => {
    const positions = new Map(events.map(({ id }, index) => [id, index]));
    const items: Array<
      { type: 'event'; event: ImpactMapEvent } | { type: 'gap'; key: string; count: number }
    > = [];
    let previous = newestFirst ? events.length : -1;
    const addGap = (key: string, count: number) => {
      if (isFiltered && count > 0) {
        items.push({ type: 'gap', key, count });
      }
    };
    visible.forEach((event) => {
      const position = positions.get(event.id) ?? 0;
      addGap(`before-${event.id}`, Math.abs(position - previous) - 1);
      items.push({ type: 'event', event });
      previous = position;
    });
    addGap('after-last', newestFirst ? previous : events.length - 1 - previous);
    return items;
  }, [events, visible, newestFirst, isFiltered]);

  const firstAt = Date.parse(events[0].at);
  const lastAt = Date.parse(events[events.length - 1].at);
  const clearFilters = () => {
    setEntityFilter([]);
    setKindFilter([]);
    setText('');
  };
  const toggleEntity = (entityId: string) =>
    setEntityFilter((current) =>
      current.includes(entityId) ? current.filter((id) => id !== entityId) : [...current, entityId]
    );

  return (
    <div ref={containerRef} data-test-subj="agenticInvestigationsTimeline">
      <EuiFlexGroup gutterSize="s" responsive={false} wrap>
        <EuiFlexItem
          css={css`
            min-width: 200px;
          `}
        >
          <EuiFieldSearch
            fullWidth
            compressed
            placeholder={SEARCH_PLACEHOLDER}
            value={text}
            onChange={(event) => setText(event.target.value)}
            isClearable
            aria-label={SEARCH_PLACEHOLDER}
            data-test-subj="agenticInvestigationsTimelineSearch"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFilterGroup compressed>
            <FilterPopover
              label={ENTITY_FILTER}
              options={entityOptions}
              selected={entityFilter}
              onChange={setEntityFilter}
              searchable
              searchPlaceholder={SEARCH_ENTITIES}
              testSubj="agenticInvestigationsTimelineEntityFilter"
            />
            <FilterPopover
              label={TYPE_FILTER}
              options={kindOptions}
              selected={kindFilter}
              onChange={setKindFilter}
              testSubj="agenticInvestigationsTimelineTypeFilter"
            />
          </EuiFilterGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem>
          <EuiText size="xs" color="subdued" data-test-subj="agenticInvestigationsTimelineSummary">
            {isFiltered
              ? i18n.translate('xpack.agenticInvestigations.timeline.summaryFiltered', {
                  defaultMessage: 'Showing {shown} of {total} events',
                  values: { shown: visible.length, total: events.length },
                })
              : i18n.translate('xpack.agenticInvestigations.timeline.summary', {
                  defaultMessage: '{total, plural, one {# event} other {# events}} over {duration}',
                  values: {
                    total: events.length,
                    duration: formatDuration(lastAt - firstAt),
                  },
                })}
          </EuiText>
        </EuiFlexItem>
        {isFiltered && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty size="xs" onClick={clearFilters}>
              {CLEAR_FILTERS}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            iconType={newestFirst ? 'sortDown' : 'sortUp'}
            onClick={() => setNewestFirst(!newestFirst)}
            data-test-subj="agenticInvestigationsTimelineSort"
          >
            {newestFirst ? NEWEST_FIRST : OLDEST_FIRST}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {visible.length === 0 ? (
        <EuiEmptyPrompt
          iconType="magnify"
          titleSize="xs"
          title={<h3>{NO_MATCHES}</h3>}
          actions={
            <EuiButton size="s" onClick={clearFilters}>
              {CLEAR_FILTERS}
            </EuiButton>
          }
        />
      ) : (
        <EuiTimeline gutterSize="m" aria-label={TIMELINE_LABEL}>
          {rows.map((row) =>
            row.type === 'gap' ? (
              <EuiTimelineItem
                key={row.key}
                verticalAlign="center"
                icon={<EuiIcon type="eyeSlash" color="subdued" aria-hidden={true} />}
              >
                <EuiLink
                  onClick={clearFilters}
                  data-test-subj="agenticInvestigationsTimelineHidden"
                >
                  <EuiText size="xs" component="span">
                    {i18n.translate('xpack.agenticInvestigations.timeline.hiddenEvents', {
                      defaultMessage:
                        '{count, plural, one {# event} other {# events}} hidden by filters. Show all',
                      values: { count: row.count },
                    })}
                  </EuiText>
                </EuiLink>
              </EuiTimelineItem>
            ) : (
              <EuiTimelineItem
                key={row.event.id}
                verticalAlign="center"
                icon={<KindAvatar kind={row.event.kind} />}
              >
                <TimelineEvent
                  event={row.event}
                  impactMap={impactMap}
                  firstAt={firstAt}
                  selected={row.event.id === selectedId || row.event.id === markedId}
                  entityFilter={entityFilter}
                  onOpen={() => setSelectedId(row.event.id)}
                  onToggleEntity={toggleEntity}
                />
              </EuiTimelineItem>
            )
          )}
        </EuiTimeline>
      )}
      {selectedId && (
        <ImpactMapEventsFlyout
          targetKey={selectedId}
          {...resolveEventsSelection({ kind: 'event', id: selectedId }, impactMap)}
          impactMap={impactMap}
          asMainFlyout={!embedded && isInAgentBuilder}
          onClose={() => {
            setSelectedId(undefined);
          }}
        />
      )}
    </div>
  );
};
