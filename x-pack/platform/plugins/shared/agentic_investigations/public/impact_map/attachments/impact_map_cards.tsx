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
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTimeline,
  EuiTimelineItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { InvestigationImpactMap } from '../../../common/impact_map/impact_map';
import type { ImpactMapEvent, InvestigationImpactMapResponse } from '../../../common';
import type { ImpactMapRenderer } from '../../types';
import {
  EventKindBadge,
  EventTime,
  ImpactMapEventsFlyout,
  getEntityIcon,
  getEntityTypeLabel,
  resolveEventsSelection,
  type EventsSelection,
} from '../../conversation_templates/templates/investigation/flyout/impact_map_events';
import { KindAvatar } from '../../conversation_templates/templates/investigation/flyout/timeline_event';
import type { InvestigationAttachmentContentProps } from '../../investigation_attachments';
import { InvestigationCard } from './investigation_card';
import { toImpactMapResponse } from './to_impact_map_response';

/** The investigation flyout's tabs, by the name after the template id. */
export type InvestigationTab = 'impactMap' | 'timeline';

const MAX_ENTITY_CARDS = 3;
const MAX_TIMELINE_ROWS = 3;

const DEFAULT_TITLE = i18n.translate('xpack.agenticInvestigations.impactMapCards.defaultTitle', {
  defaultMessage: 'Impact map',
});
const TIMELINE_TITLE = i18n.translate('xpack.agenticInvestigations.impactMapCards.timelineTitle', {
  defaultMessage: 'Timeline',
});
const EMPTY = i18n.translate('xpack.agenticInvestigations.impactMapCards.empty', {
  defaultMessage: 'Nothing recorded yet.',
});

const mapSummary = (entities: number, relationships: number): string =>
  i18n.translate('xpack.agenticInvestigations.impactMapCards.mapSummary', {
    defaultMessage:
      '{entities, plural, one {# entity} other {# entities}}, {relationships, plural, one {# relationship} other {# relationships}}',
    values: { entities, relationships },
  });

const moreEvents = (count: number): string =>
  i18n.translate('xpack.agenticInvestigations.impactMapCards.moreEvents', {
    defaultMessage: 'Show {count} more',
    values: { count },
  });

const FEWER_EVENTS = i18n.translate('xpack.agenticInvestigations.impactMapCards.fewerEvents', {
  defaultMessage: 'Show fewer',
});

const eventsLabel = (count: number): string =>
  i18n.translate('xpack.agenticInvestigations.impactMapCards.eventCount', {
    defaultMessage: '{count, plural, one {# event} other {# events}}',
    values: { count },
  });

/** The entities that matter most: where users feel the problem, the root cause, the unhealthy. */
export const pickKeyEntities = (
  { entities, events }: Pick<InvestigationImpactMapResponse, 'entities' | 'events'>,
  max = MAX_ENTITY_CARDS
) => {
  const score = ({ id, annotations }: (typeof entities)[number]): number =>
    (annotations?.impacted ? 4 : 0) +
    (annotations?.role === 'root_cause' ? 4 : 0) +
    (annotations?.health && annotations.health !== 'healthy' ? 2 : 0) +
    (events.some(({ entity_id: entityId }) => entityId === id) ? 1 : 0);
  return entities
    .map((entity, index) => ({ entity, index, score: score(entity) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, max)
    .map(({ entity }) => entity);
};

const EntityCard: React.FC<{
  entityId: string;
  impactMap: InvestigationImpactMapResponse;
  onOpen: (selection: EventsSelection) => void;
}> = ({ entityId, impactMap, onOpen }) => {
  const entity = impactMap.entities.find(({ id }) => id === entityId);
  if (!entity) {
    return null;
  }
  const type = impactMap.entity_types.find(({ id }) => id === entity.type_id);
  const eventCount = impactMap.events.filter(({ entity_id: id }) => id === entity.id).length;
  const typeLabel = getEntityTypeLabel(type, entity.label);
  return (
    <InvestigationCard
      title={entity.label}
      icon={getEntityIcon(type)}
      onClick={() => onOpen({ kind: 'entity', id: entity.id })}
      data-test-subj="agenticInvestigationsEntityCard"
      badges={
        <>
          {typeLabel && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow" iconType={getEntityIcon(type)}>
                {typeLabel}
              </EuiBadge>
            </EuiFlexItem>
          )}
          {entity.annotations?.impacted && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="danger">
                {i18n.translate('xpack.agenticInvestigations.impactMapCards.impacted', {
                  defaultMessage: 'Impacted',
                })}
              </EuiBadge>
            </EuiFlexItem>
          )}
        </>
      }
      subtitle={eventCount > 0 ? eventsLabel(eventCount) : undefined}
    />
  );
};

const MAP_PREVIEW_HEIGHT = 240;

const formatDay = (at: string) =>
  new Date(at).toLocaleString(undefined, { month: 'short', day: 'numeric' });

/** The map itself, drawn small. The card around it opens the full map, so it does not pan. */
const MapCard: React.FC<{
  impactMap: InvestigationImpactMapResponse;
  Renderer?: ImpactMapRenderer;
  onOpen: () => void;
}> = ({ impactMap, Renderer, onOpen }) => {
  const name = impactMap.title?.trim();
  return (
    <InvestigationCard
      title={DEFAULT_TITLE}
      icon="graphApp"
      onClick={onOpen}
      data-test-subj="agenticInvestigationsImpactMapCard"
      subtitle={name}
    >
      <EuiText size="xs" color="subdued">
        <p>{mapSummary(impactMap.entities.length, impactMap.relationships.length)}</p>
      </EuiText>
      {Renderer && (
        <>
          <EuiSpacer size="s" />
          <div
            data-test-subj="agenticInvestigationsImpactMapCardPreview"
            css={css`
              height: ${MAP_PREVIEW_HEIGHT}px;
              overflow: hidden;
              pointer-events: none;
              border-radius: 6px;
            `}
          >
            <Renderer impactMap={impactMap} />
          </div>
        </>
      )}
    </InvestigationCard>
  );
};

/** How many events of each kind, so the shape of the incident reads before the rows do. */
const kindCounts = (events: ImpactMapEvent[]) => {
  const counts = new Map<ImpactMapEvent['kind'], number>();
  events.forEach(({ kind }) => counts.set(kind, (counts.get(kind) ?? 0) + 1));
  return [...counts.entries()];
};

/** The latest events as a short timeline; the card opens the whole one in the investigation. */
const TimelineCard: React.FC<{
  impactMap: InvestigationImpactMapResponse;
  onOpen: () => void;
  onOpenEvent: (eventId: string) => void;
}> = ({ impactMap, onOpen, onOpenEvent }) => {
  const { events } = impactMap;
  const [expanded, setExpanded] = useState(false);
  const newestFirst = [...events].reverse();
  const shown = expanded ? newestFirst : newestFirst.slice(0, MAX_TIMELINE_ROWS);
  const hidden = events.length - MAX_TIMELINE_ROWS;
  const first = events[0];
  const last = events[events.length - 1];
  return (
    <InvestigationCard
      title={TIMELINE_TITLE}
      icon="clock"
      onClick={onOpen}
      data-test-subj="agenticInvestigationsTimelineCard"
      subtitle={`${eventsLabel(events.length)} · ${formatDay(first.at)}${
        formatDay(first.at) === formatDay(last.at) ? '' : ` – ${formatDay(last.at)}`
      }`}
    >
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
        {kindCounts(events).map(([kind, count]) => (
          <EuiFlexItem grow={false} key={kind}>
            <EventKindBadge kind={kind} count={count} />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiTimeline gutterSize="m" data-test-subj="agenticInvestigationsTimelineCardEvents">
        {shown.map((event) => (
          <EuiTimelineItem
            key={event.id}
            verticalAlign="center"
            icon={<KindAvatar kind={event.kind} />}
          >
            {/* The rows open the event; the card around them opens the whole timeline. */}
            {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
            <div
              onClick={(clicked) => {
                clicked.stopPropagation();
                onOpenEvent(event.id);
              }}
              css={css`
                cursor: pointer;
                min-width: 0;
              `}
              data-test-subj="agenticInvestigationsTimelineCardEvent"
            >
              <EuiText size="xs" color="subdued">
                <EventTime at={event.at} withDate />
              </EuiText>
              <EuiText
                size="s"
                css={css`
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                `}
              >
                <strong>{event.title}</strong>
              </EuiText>
            </div>
          </EuiTimelineItem>
        ))}
      </EuiTimeline>
      {hidden > 0 && (
        <EuiButtonEmpty
          size="xs"
          iconType={expanded ? 'chevronSingleUp' : 'chevronSingleDown'}
          flush="left"
          // The card around it opens the timeline; this only expands the card.
          onClick={(clicked: React.MouseEvent) => {
            clicked.stopPropagation();
            setExpanded((current) => !current);
          }}
          data-test-subj="agenticInvestigationsTimelineCardToggle"
        >
          {expanded ? FEWER_EVENTS : moreEvents(hidden)}
        </EuiButtonEmpty>
      )}
    </InvestigationCard>
  );
};

/**
 * The impact map attachment in the chat: cards for the impact map, the timeline and the entities
 * that matter most. A card opens the same view the investigation flyout has, over the chat.
 */
export const createImpactMapCards = (
  getRenderer: () => ImpactMapRenderer | undefined,
  openInInvestigation: (conversationId: string, tab: InvestigationTab) => void
): React.FC<InvestigationAttachmentContentProps<InvestigationImpactMap>> => {
  const ImpactMapCards: React.FC<InvestigationAttachmentContentProps<InvestigationImpactMap>> = ({
    document,
  }) => {
    const { conversationId } = document;
    const impactMap = useMemo(() => toImpactMapResponse(document), [document]);
    const [selection, setSelection] = useState<EventsSelection>();
    const Renderer = getRenderer();

    if (impactMap.entities.length === 0 && impactMap.events.length === 0) {
      return (
        <EuiText size="s" color="subdued">
          <p>{EMPTY}</p>
        </EuiText>
      );
    }

    // Nothing to show for a target with no events or facts, so a click on it does nothing.
    const open = (next: EventsSelection) => {
      const { events, metadata } = resolveEventsSelection(next, impactMap);
      if (events.length > 0 || (metadata?.length ?? 0) > 0) {
        setSelection(next);
      }
    };
    const keyEntities = pickKeyEntities(impactMap);
    const selected = selection && resolveEventsSelection(selection, impactMap);

    return (
      <div data-test-subj="agenticInvestigationsImpactMapCards">
        <EuiFlexGroup direction="column" gutterSize="s">
          {impactMap.entities.length > 0 && (
            <EuiFlexItem>
              <MapCard
                impactMap={impactMap}
                Renderer={Renderer}
                onOpen={() => openInInvestigation(conversationId, 'impactMap')}
              />
            </EuiFlexItem>
          )}
          {impactMap.events.length > 0 && (
            <EuiFlexItem>
              <TimelineCard
                impactMap={impactMap}
                onOpen={() => openInInvestigation(conversationId, 'timeline')}
                onOpenEvent={(id) => open({ kind: 'event', id })}
              />
            </EuiFlexItem>
          )}
          {keyEntities.map((entity) => (
            <EuiFlexItem key={entity.id}>
              <EntityCard entityId={entity.id} impactMap={impactMap} onOpen={open} />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
        {selection && selected && (
          <ImpactMapEventsFlyout
            {...selected}
            impactMap={impactMap}
            asMainFlyout
            targetKey={`${selection.kind}:${selection.id}`}
            onClose={() => setSelection(undefined)}
          />
        )}
      </div>
    );
  };
  return ImpactMapCards;
};
