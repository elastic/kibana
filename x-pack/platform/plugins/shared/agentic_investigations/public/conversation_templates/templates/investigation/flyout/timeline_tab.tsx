/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiComboBox,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  type EuiComboBoxOptionOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedTime } from '@kbn/i18n-react';
import type { TimelineSlotRenderProps } from '@kbn/agentic-investigations-common';
import type { ImpactMapEvent, InvestigationImpactMapResponse } from '../../../../../common';
import { useInvestigation } from '../../../../investigations/hooks/use_investigation';
import {
  EVENT_GROUPS,
  ImpactMapEventsFlyout,
  describeEventTarget,
  getEventEntityIds,
  getEventGroup,
  resolveEventsSelection,
  type EventGroup,
  type EventGroupId,
} from './impact_map_events';

const EMPTY_TITLE = i18n.translate('xpack.agenticInvestigations.timeline.emptyTitle', {
  defaultMessage: 'Nothing on the timeline yet',
});
const EMPTY_BODY = i18n.translate('xpack.agenticInvestigations.timeline.emptyBody', {
  defaultMessage:
    'Changes, failures, alerts and what responders did appear here in the order they happened.',
});
const NO_MATCHES = i18n.translate('xpack.agenticInvestigations.timeline.noMatches', {
  defaultMessage: 'No events match these filters.',
});
const SEARCH_PLACEHOLDER = i18n.translate('xpack.agenticInvestigations.timeline.search', {
  defaultMessage: 'Search',
});
const SEARCH_LABEL = i18n.translate('xpack.agenticInvestigations.timeline.searchLabel', {
  defaultMessage: 'Filter the timeline by entity or text',
});
const FILTER_BY = i18n.translate('xpack.agenticInvestigations.timeline.filterBy', {
  defaultMessage: 'Filter by',
});
const TIMELINE_TITLE = i18n.translate('xpack.agenticInvestigations.timeline.title', {
  defaultMessage: 'Timeline',
});
const LATEST_FIRST = i18n.translate('xpack.agenticInvestigations.timeline.latestFirst', {
  defaultMessage: 'Latest first',
});
const OLDEST_FIRST = i18n.translate('xpack.agenticInvestigations.timeline.oldestFirst', {
  defaultMessage: 'Oldest first',
});
const COLLAPSE = i18n.translate('xpack.agenticInvestigations.timeline.collapse', {
  defaultMessage: 'Collapse the timeline',
});
const EXPAND = i18n.translate('xpack.agenticInvestigations.timeline.expand', {
  defaultMessage: 'Expand the timeline',
});

const ICON_SIZE = 28;

const GroupIcon: React.FC<{ group: EventGroup; filled?: boolean }> = ({ group, filled }) => {
  const { euiTheme } = useEuiTheme();
  const color = euiTheme.colors[group.color];
  return (
    <span
      css={css`
        display: inline-flex;
        flex: none;
        align-items: center;
        justify-content: center;
        width: ${ICON_SIZE}px;
        height: ${ICON_SIZE}px;
        border-radius: 50%;
        border: 2px solid ${color};
        background: ${filled ? color : euiTheme.colors.backgroundBasePlain};
      `}
    >
      <EuiIcon
        type={group.icon}
        size="s"
        color={filled ? euiTheme.colors.backgroundBasePlain : color}
        aria-hidden
      />
    </span>
  );
};

/** Matches an event against the chosen entities, groups and text. Empty filters match all. */
const matches = (
  event: ImpactMapEvent,
  impactMap: InvestigationImpactMapResponse,
  { entityIds, groupIds, text }: { entityIds: string[]; groupIds: EventGroupId[]; text: string }
): boolean => {
  if (groupIds.length && !groupIds.includes(getEventGroup(event.kind).id)) {
    return false;
  }
  const touched = getEventEntityIds(event, impactMap.relationships);
  if (entityIds.length && !touched.some((id) => entityIds.includes(id))) {
    return false;
  }
  const needle = text.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  return [event.title, event.description ?? '', describeEventTarget(event, impactMap)].some(
    (value) => value.toLowerCase().includes(needle)
  );
};

const TimelineRow: React.FC<{
  event: ImpactMapEvent;
  impactMap: InvestigationImpactMapResponse;
  selected: boolean;
  filteredEntityIds: string[];
  onOpen: () => void;
  onToggleEntity: (entityId: string) => void;
}> = ({ event, impactMap, selected, filteredEntityIds, onOpen, onToggleEntity }) => {
  const { euiTheme } = useEuiTheme();
  const group = getEventGroup(event.kind);
  const entityIds = getEventEntityIds(event, impactMap.relationships);
  const labelOf = (id: string) =>
    impactMap.entities.find((entity) => entity.id === id)?.label ?? id;

  return (
    <div
      data-test-subj="agenticInvestigationsTimelineRow"
      css={css`
        position: relative;
        display: flex;
        align-items: center;
        gap: ${euiTheme.size.m};
        padding: ${euiTheme.size.xs} ${euiTheme.size.s} ${euiTheme.size.xs} 0;
        border-radius: ${euiTheme.border.radius.medium};
        background: ${selected ? euiTheme.colors.backgroundBaseInteractiveSelect : 'transparent'};
        &:hover {
          background: ${euiTheme.colors.backgroundBaseInteractiveHover};
        }
      `}
    >
      <GroupIcon group={group} filled={selected} />
      <EuiText
        size="s"
        color="subdued"
        css={css`
          flex: none;
          font-variant-numeric: tabular-nums;
        `}
      >
        <FormattedTime
          value={new Date(event.at)}
          hour="2-digit"
          minute="2-digit"
          hourCycle="h23"
          timeZone="UTC"
        />{' '}
        UTC
      </EuiText>
      <button
        type="button"
        onClick={onOpen}
        title={event.title}
        data-test-subj="agenticInvestigationsTimelineOpenEvent"
        css={css`
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-align: left;
          font-size: ${euiTheme.size.base};
          font-weight: ${selected ? euiTheme.font.weight.bold : euiTheme.font.weight.regular};
          color: ${euiTheme.colors.textParagraph};
          /* The whole row opens the event. */
          &::after {
            content: '';
            position: absolute;
            inset: 0;
          }
        `}
      >
        {event.title}
      </button>
      {entityIds.length > 0 && (
        <EuiFlexGroup
          gutterSize="xs"
          responsive={false}
          wrap={false}
          css={css`
            flex: none;
            /* Positioned after the title, so it paints above the title's full-row click area. */
            position: relative;
          `}
        >
          {entityIds.map((entityId) => {
            const label = labelOf(entityId);
            const active = filteredEntityIds.includes(entityId);
            return (
              <EuiFlexItem grow={false} key={entityId}>
                <EuiBadge
                  color={active ? 'primary' : 'hollow'}
                  iconType="branch"
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
          })}
        </EuiFlexGroup>
      )}
    </div>
  );
};

/**
 * The Timeline tab: every event of the investigation, including findings and responder actions,
 * filterable by entity, by kind of event and by text. An event opens its detail in a child flyout.
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

  return <Timeline impactMap={impactMap} />;
};

const Timeline: React.FC<{ impactMap: InvestigationImpactMapResponse }> = ({ impactMap }) => {
  const { euiTheme } = useEuiTheme();
  const [entityIds, setEntityIds] = useState<string[]>([]);
  const [groupIds, setGroupIds] = useState<EventGroupId[]>([]);
  const [text, setText] = useState('');
  const [latestFirst, setLatestFirst] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const [selectedId, setSelectedId] = useState<string>();
  const { events } = impactMap;
  const kindsPresent = useMemo(() => new Set(events.map(({ kind }) => kind)), [events]);

  const entityOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(() => {
    const withEvents = new Set(
      events.flatMap((event) => getEventEntityIds(event, impactMap.relationships))
    );
    return impactMap.entities
      .filter(({ id }) => withEvents.has(id))
      .map(({ id, label }) => ({
        label,
        value: id,
        prepend: <EuiIcon type="branch" size="s" aria-hidden={true} />,
      }));
  }, [events, impactMap]);

  const visible = useMemo(() => {
    const filtered = events.filter((event) =>
      matches(event, impactMap, { entityIds, groupIds, text })
    );
    return latestFirst ? [...filtered].reverse() : filtered;
  }, [events, impactMap, entityIds, groupIds, text, latestFirst]);

  const toggleEntity = (entityId: string) =>
    setEntityIds((current) =>
      current.includes(entityId) ? current.filter((id) => id !== entityId) : [...current, entityId]
    );
  const toggleGroup = (groupId: EventGroupId) =>
    setGroupIds((current) =>
      current.includes(groupId) ? current.filter((id) => id !== groupId) : [...current, groupId]
    );

  return (
    <div data-test-subj="agenticInvestigationsTimeline">
      <EuiComboBox<string>
        fullWidth
        aria-label={SEARCH_LABEL}
        placeholder={SEARCH_PLACEHOLDER}
        prepend={<EuiIcon type="magnify" aria-hidden={true} />}
        options={entityOptions}
        selectedOptions={entityOptions.filter(({ value }) => value && entityIds.includes(value))}
        onChange={(selected) =>
          setEntityIds(selected.flatMap(({ value }) => (value ? [value] : [])))
        }
        onSearchChange={setText}
        data-test-subj="agenticInvestigationsTimelineSearch"
      />
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            <EuiIcon type="filter" size="s" aria-hidden={true} /> {FILTER_BY}
          </EuiText>
        </EuiFlexItem>
        {EVENT_GROUPS.filter(({ id }) => kindsPresent.has(id)).map((group) => {
          const active = groupIds.includes(group.id);
          return (
            <EuiFlexItem grow={false} key={group.id}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => toggleGroup(group.id)}
                data-test-subj={`agenticInvestigationsTimelineGroup-${group.id}`}
                css={css`
                  display: inline-flex;
                  align-items: center;
                  gap: ${euiTheme.size.xs};
                  padding: 2px ${euiTheme.size.s} 2px 2px;
                  border-radius: ${ICON_SIZE}px;
                  font-size: ${euiTheme.size.base};
                  color: ${euiTheme.colors.textParagraph};
                  background: ${active ? euiTheme.colors.backgroundBaseInteractiveSelect : 'none'};
                  &:hover {
                    background: ${euiTheme.colors.backgroundBaseInteractiveHover};
                  }
                `}
              >
                <GroupIcon group={group} filled={active} />
                {group.label}
              </button>
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiPanel color="subdued" hasBorder hasShadow={false} paddingSize="s">
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              color="text"
              iconType={isOpen ? 'chevronSingleDown' : 'chevronSingleRight'}
              aria-label={isOpen ? COLLAPSE : EXPAND}
              aria-expanded={isOpen}
              onClick={() => setIsOpen(!isOpen)}
              data-test-subj="agenticInvestigationsTimelineToggle"
            >
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiIcon type="timeline" aria-hidden={true} />
                <EuiTitle size="xs">
                  <h3>{TIMELINE_TITLE}</h3>
                </EuiTitle>
              </EuiFlexGroup>
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem />
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              iconType="sortable"
              onClick={() => setLatestFirst(!latestFirst)}
              data-test-subj="agenticInvestigationsTimelineSort"
            >
              {latestFirst ? LATEST_FIRST : OLDEST_FIRST}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      {isOpen && (
        <>
          <EuiSpacer size="s" />
          {visible.length === 0 ? (
            <EuiText size="s" color="subdued" textAlign="center">
              <p>{NO_MATCHES}</p>
            </EuiText>
          ) : (
            <div
              css={css`
                position: relative;
                display: flex;
                flex-direction: column;
                gap: ${euiTheme.size.xs};
                /* The line that joins the event icons. */
                &::before {
                  content: '';
                  position: absolute;
                  top: ${ICON_SIZE / 2}px;
                  bottom: ${ICON_SIZE / 2}px;
                  left: ${ICON_SIZE / 2 - 1}px;
                  border-left: 2px solid ${euiTheme.colors.borderBaseSubdued};
                }
              `}
            >
              {visible.map((event) => (
                <TimelineRow
                  key={event.id}
                  event={event}
                  impactMap={impactMap}
                  selected={event.id === selectedId}
                  filteredEntityIds={entityIds}
                  onOpen={() => setSelectedId(event.id)}
                  onToggleEntity={toggleEntity}
                />
              ))}
            </div>
          )}
        </>
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
