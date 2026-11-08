/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiAvatar,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconTip,
  EuiLink,
  EuiPanel,
  EuiPopover,
  EuiSelectable,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTimeline,
  EuiTimelineItem,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
  type EuiSelectableOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedTime } from '@kbn/i18n-react';
import type { TimelineSlotRenderProps } from '@kbn/agentic-investigations-common';
import { takeTimelineFocus } from './timeline_focus';
import type {
  ImpactMapEvent,
  ImpactMapEventKind,
  InvestigationImpactMapResponse,
} from '../../../../../common';
import { useInvestigation } from '../../../../investigations/hooks/use_investigation';
import {
  EVENT_GROUPS,
  EventKindBadge,
  ImpactMapEventsFlyout,
  describeEventTarget,
  getEventEntityIds,
  getEventGroup,
  resolveEventsSelection,
} from './impact_map_events';

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
const HAS_CHART = i18n.translate('xpack.agenticInvestigations.timeline.hasChart', {
  defaultMessage: 'Has a chart',
});
const SINCE_FIRST = i18n.translate('xpack.agenticInvestigations.timeline.sinceFirst', {
  defaultMessage: 'Time since the first event',
});

const TIMELINE_LABEL = i18n.translate('xpack.agenticInvestigations.timeline.label', {
  defaultMessage: 'Investigation timeline',
});

const MINUTE_MS = 60_000;

/** "57m" or "1h 12m". */
const formatDuration = (ms: number): string => {
  const minutes = Math.round(ms / MINUTE_MS);
  const hours = Math.floor(minutes / 60);
  return hours > 0
    ? i18n.translate('xpack.agenticInvestigations.timeline.durationHours', {
        defaultMessage: '{hours}h {minutes}m',
        values: { hours, minutes: minutes % 60 },
      })
    : i18n.translate('xpack.agenticInvestigations.timeline.durationMinutes', {
        defaultMessage: '{minutes}m',
        values: { minutes },
      });
};

/** "+57m" after the first event, so the order of a cascade reads at a glance. */
const formatOffset = (ms: number): string =>
  i18n.translate('xpack.agenticInvestigations.timeline.offset', {
    defaultMessage: '+{duration}',
    values: { duration: formatDuration(ms) },
  });

const UtcTime: React.FC<{ at: string }> = ({ at }) => (
  <>
    <FormattedTime
      value={new Date(at)}
      hour="2-digit"
      minute="2-digit"
      hourCycle="h23"
      timeZone="UTC"
    />{' '}
    UTC
  </>
);

const KindAvatar: React.FC<{ kind: ImpactMapEventKind }> = ({ kind }) => {
  const { euiTheme } = useEuiTheme();
  const { icon, color, label } = getEventGroup(kind);
  const background = {
    primary: euiTheme.colors.backgroundLightPrimary,
    success: euiTheme.colors.backgroundLightSuccess,
    warning: euiTheme.colors.backgroundLightWarning,
    danger: euiTheme.colors.backgroundLightDanger,
    accent: euiTheme.colors.backgroundLightAccent,
  }[color];
  return (
    <EuiAvatar
      name={label}
      size="m"
      iconType={icon}
      iconColor={euiTheme.colors[color]}
      color={background}
    />
  );
};

interface FilterOption {
  key: string;
  label: string;
  count: number;
}

/** A filter button with a popover of options and how many events each has, as Discover does. */
const FilterPopover: React.FC<{
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  testSubj: string;
}> = ({ label, options, selected, onChange, searchable, searchPlaceholder, testSubj }) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverId = useGeneratedHtmlId({ prefix: testSubj });
  const selectable: EuiSelectableOption[] = options.map(({ key, label: optionLabel, count }) => ({
    key,
    label: optionLabel,
    checked: selected.includes(key) ? 'on' : undefined,
    append: <EuiBadge color="hollow">{count}</EuiBadge>,
  }));
  return (
    <EuiPopover
      id={popoverId}
      aria-label={label}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      button={
        <EuiFilterButton
          iconType="chevronSingleDown"
          onClick={() => setIsOpen(!isOpen)}
          isSelected={isOpen}
          hasActiveFilters={selected.length > 0}
          numFilters={options.length}
          numActiveFilters={selected.length}
          data-test-subj={testSubj}
        >
          {label}
        </EuiFilterButton>
      }
    >
      <EuiSelectable
        aria-label={label}
        options={selectable}
        searchable={searchable}
        searchProps={searchable ? { placeholder: searchPlaceholder, compressed: true } : undefined}
        onChange={(next) =>
          onChange(next.flatMap(({ key, checked }) => (checked === 'on' && key ? [key] : [])))
        }
        listProps={{ showIcons: true }}
        data-test-subj={`${testSubj}Options`}
      >
        {(list, search) => (
          <div
            css={css`
              width: 280px;
            `}
          >
            {search && <EuiPanel paddingSize="s">{search}</EuiPanel>}
            {list}
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};

const TimelineEvent: React.FC<{
  event: ImpactMapEvent;
  impactMap: InvestigationImpactMapResponse;
  firstAt: number;
  selected: boolean;
  entityFilter: string[];
  onOpen: () => void;
  onToggleEntity: (entityId: string) => void;
}> = ({ event, impactMap, firstAt, selected, entityFilter, onOpen, onToggleEntity }) => {
  const entityIds = getEventEntityIds(event, impactMap.relationships);
  const labelOf = (id: string) =>
    impactMap.entities.find((entity) => entity.id === id)?.label ?? id;
  const offset = Date.parse(event.at) - firstAt;

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="s"
      color={selected ? 'primary' : 'plain'}
      data-test-subj="agenticInvestigationsTimelineRow"
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            <strong>
              <UtcTime at={event.at} />
            </strong>
          </EuiText>
        </EuiFlexItem>
        {offset > 0 && (
          <EuiFlexItem grow={false}>
            <EuiToolTip content={SINCE_FIRST}>
              <EuiText size="xs" color="subdued" tabIndex={0}>
                {formatOffset(offset)}
              </EuiText>
            </EuiToolTip>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EventKindBadge kind={event.kind} />
        </EuiFlexItem>
        {event.evidence?.chart && (
          <EuiFlexItem grow={false}>
            <EuiIconTip content={HAS_CHART} type="chartLine" color="subdued" />
          </EuiFlexItem>
        )}
        <EuiFlexItem />
        {entityIds.length === 0 ? (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {describeEventTarget(event, impactMap)}
            </EuiText>
          </EuiFlexItem>
        ) : (
          entityIds.map((entityId) => {
            const label = labelOf(entityId);
            const active = entityFilter.includes(entityId);
            return (
              <EuiFlexItem grow={false} key={entityId}>
                <EuiBadge
                  color={active ? 'primary' : 'hollow'}
                  onClick={() => onToggleEntity(entityId)}
                  onClickAriaLabel={i18n.translate(
                    'xpack.agenticInvestigations.timeline.toggleEntity',
                    {
                      defaultMessage:
                        '{active, select, true {Stop filtering by} other {Filter by}} {label}',
                      values: { active: String(active), label },
                    }
                  )}
                  data-test-subj="agenticInvestigationsTimelineEntity"
                >
                  {label}
                </EuiBadge>
              </EuiFlexItem>
            );
          })
        )}
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiText size="s">
        <EuiLink onClick={onOpen} data-test-subj="agenticInvestigationsTimelineOpenEvent">
          <strong>{event.title}</strong>
        </EuiLink>
      </EuiText>
      {event.description && (
        <EuiText
          size="xs"
          color="subdued"
          css={css`
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          `}
        >
          {event.description}
        </EuiText>
      )}
    </EuiPanel>
  );
};

/**
 * The Timeline tab: every event of the investigation, including findings and responder actions,
 * with search, entity and type filters. An event opens its detail over the investigation flyout.
 */
export const TimelineTab: React.FC<TimelineSlotRenderProps> = ({ conversationId }) => {
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

  return <Timeline impactMap={impactMap} conversationId={conversationId} />;
};

const Timeline: React.FC<{
  impactMap: InvestigationImpactMapResponse;
  conversationId: string;
}> = ({ impactMap, conversationId }) => {
  // Opened from the map's "View in timeline", it starts filtered by that entity.
  const [entityFilter, setEntityFilter] = useState<string[]>(() =>
    takeTimelineFocus(conversationId)
  );
  const [kindFilter, setKindFilter] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [newestFirst, setNewestFirst] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();
  const { events, entities, relationships } = impactMap;

  const entityOptions = useMemo<FilterOption[]>(() => {
    const counts = new Map<string, number>();
    events.forEach((event) =>
      getEventEntityIds(event, relationships).forEach((id) =>
        counts.set(id, (counts.get(id) ?? 0) + 1)
      )
    );
    return entities
      .filter(({ id }) => counts.has(id))
      .map(({ id, label }) => ({ key: id, label, count: counts.get(id) ?? 0 }));
  }, [events, entities, relationships]);

  const kindOptions = useMemo<FilterOption[]>(
    () =>
      EVENT_GROUPS.map(({ id, label }) => ({
        key: id,
        label,
        count: events.filter(({ kind }) => kind === id).length,
      })).filter(({ count }) => count > 0),
    [events]
  );

  const isFiltered = entityFilter.length > 0 || kindFilter.length > 0 || text.trim() !== '';

  const visible = useMemo(() => {
    const needle = text.trim().toLowerCase();
    const filtered = events.filter((event) => {
      if (kindFilter.length && !kindFilter.includes(event.kind)) {
        return false;
      }
      const touched = getEventEntityIds(event, relationships);
      if (entityFilter.length && !touched.some((id) => entityFilter.includes(id))) {
        return false;
      }
      return (
        !needle ||
        [event.title, event.description ?? '', describeEventTarget(event, impactMap)].some(
          (value) => value.toLowerCase().includes(needle)
        )
      );
    });
    return newestFirst ? [...filtered].reverse() : filtered;
  }, [events, relationships, impactMap, entityFilter, kindFilter, text, newestFirst]);

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
    <div data-test-subj="agenticInvestigationsTimeline">
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
                icon={<EuiIcon type="eyeClosed" color="subdued" aria-hidden={true} />}
              >
                <EuiText
                  size="xs"
                  color="subdued"
                  data-test-subj="agenticInvestigationsTimelineHidden"
                >
                  {i18n.translate('xpack.agenticInvestigations.timeline.hiddenEvents', {
                    defaultMessage:
                      '{count, plural, one {# event} other {# events}} hidden by filters',
                    values: { count: row.count },
                  })}
                </EuiText>
              </EuiTimelineItem>
            ) : (
              <EuiTimelineItem
                key={row.event.id}
                verticalAlign="top"
                icon={<KindAvatar kind={row.event.kind} />}
              >
                <TimelineEvent
                  event={row.event}
                  impactMap={impactMap}
                  firstAt={firstAt}
                  selected={row.event.id === selectedId}
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
          key={selectedId}
          {...resolveEventsSelection({ kind: 'event', id: selectedId }, impactMap)}
          impactMap={impactMap}
          asMainFlyout
          onClose={() => setSelectedId(undefined)}
        />
      )}
    </div>
  );
};
