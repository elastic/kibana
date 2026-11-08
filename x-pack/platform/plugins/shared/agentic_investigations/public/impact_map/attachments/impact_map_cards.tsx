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
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiPortal,
  EuiSpacer,
  EuiText,
  EuiTimeline,
  EuiTimelineItem,
  EuiTitle,
  useGeneratedHtmlId,
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
import {
  KindAvatar,
  TimelineEvent,
} from '../../conversation_templates/templates/investigation/flyout/timeline_event';
import type { InvestigationAttachmentContentProps } from '../../investigation_attachments';
import { InvestigationCard } from './investigation_card';
import { toImpactMapResponse } from './to_impact_map_response';

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

const TimelineCard: React.FC<{
  impactMap: InvestigationImpactMapResponse;
  onOpenTimeline: () => void;
  onOpenEvent: (eventId: string) => void;
}> = ({ impactMap, onOpenTimeline, onOpenEvent }) => {
  const { events } = impactMap;
  const shown = events.slice(0, MAX_TIMELINE_ROWS);
  return (
    <InvestigationCard
      title={TIMELINE_TITLE}
      icon="clock"
      onClick={onOpenTimeline}
      data-test-subj="agenticInvestigationsTimelineCard"
      subtitle={eventsLabel(events.length)}
    >
      <EuiSpacer size="s" />
      {shown.map((event) => (
        // The rows open the event; the card around them opens the whole timeline.
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
        <div
          key={event.id}
          onClick={(clicked) => {
            clicked.stopPropagation();
            onOpenEvent(event.id);
          }}
          css={css`
            cursor: pointer;
          `}
          data-test-subj="agenticInvestigationsTimelineCardEvent"
        >
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                <EventTime at={event.at} />
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EventKindBadge kind={event.kind} />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="xs">
                <span>{event.title}</span>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      ))}
    </InvestigationCard>
  );
};

const MapCard: React.FC<{
  impactMap: InvestigationImpactMapResponse;
  onOpen?: () => void;
}> = ({ impactMap, onOpen }) => (
  <InvestigationCard
    title={impactMap.title?.trim() || DEFAULT_TITLE}
    icon="graphApp"
    onClick={onOpen}
    data-test-subj="agenticInvestigationsImpactMapCard"
    subtitle={mapSummary(impactMap.entities.length, impactMap.relationships.length)}
  />
);

/** Every event in the Timeline tab's own rows, over the chat. */
const TimelineFlyout: React.FC<{
  impactMap: InvestigationImpactMapResponse;
  onOpenEvent: (eventId: string) => void;
  onClose: () => void;
}> = ({ impactMap, onOpenEvent, onClose }) => {
  const titleId = useGeneratedHtmlId({ prefix: 'impactMapCardsTimelineTitle' });
  const firstAt = Math.min(...impactMap.events.map(({ at }) => Date.parse(at)));
  return (
    <EuiPortal>
      <EuiFlyout
        onClose={onClose}
        aria-labelledby={titleId}
        size="m"
        data-test-subj="agenticInvestigationsTimelineCardFlyout"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id={titleId}>{TIMELINE_TITLE}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiTimeline gutterSize="m">
            {impactMap.events.map((event: ImpactMapEvent) => (
              <EuiTimelineItem
                key={event.id}
                verticalAlign="center"
                icon={<KindAvatar kind={event.kind} />}
              >
                <TimelineEvent
                  event={event}
                  impactMap={impactMap}
                  firstAt={firstAt}
                  selected={false}
                  onOpen={() => onOpenEvent(event.id)}
                />
              </EuiTimelineItem>
            ))}
          </EuiTimeline>
        </EuiFlyoutBody>
      </EuiFlyout>
    </EuiPortal>
  );
};

const MapFlyout: React.FC<{
  impactMap: InvestigationImpactMapResponse;
  Renderer: ImpactMapRenderer;
  onOpen: (selection: EventsSelection) => void;
  onClose: () => void;
}> = ({ impactMap, Renderer, onOpen, onClose }) => {
  const titleId = useGeneratedHtmlId({ prefix: 'impactMapCardsMapTitle' });
  return (
    <EuiPortal>
      <EuiFlyout
        onClose={onClose}
        aria-labelledby={titleId}
        size="l"
        data-test-subj="agenticInvestigationsImpactMapCardFlyout"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id={titleId}>{impactMap.title?.trim() || DEFAULT_TITLE}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <div
            css={css`
              height: 100%;
              min-height: 360px;
            `}
          >
            <Renderer
              impactMap={impactMap}
              onEntityClick={(id) => onOpen({ kind: 'entity', id })}
              onRelationshipClick={(id) => onOpen({ kind: 'relationship', id })}
            />
          </div>
        </EuiFlyoutBody>
      </EuiFlyout>
    </EuiPortal>
  );
};

type Panel = 'map' | 'timeline';

/**
 * The impact map attachment in the chat: cards for the impact map, the timeline and the entities
 * that matter most. A card opens the same view the investigation flyout has, over the chat.
 */
export const createImpactMapCards = (
  getRenderer: () => ImpactMapRenderer | undefined
): React.FC<InvestigationAttachmentContentProps<InvestigationImpactMap>> => {
  const ImpactMapCards: React.FC<InvestigationAttachmentContentProps<InvestigationImpactMap>> = ({
    document,
  }) => {
    const impactMap = useMemo(() => toImpactMapResponse(document), [document]);
    const [panel, setPanel] = useState<Panel>();
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
                onOpen={Renderer ? () => setPanel('map') : undefined}
              />
            </EuiFlexItem>
          )}
          {impactMap.events.length > 0 && (
            <EuiFlexItem>
              <TimelineCard
                impactMap={impactMap}
                onOpenTimeline={() => setPanel('timeline')}
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
        {!selection && panel === 'map' && Renderer && (
          <MapFlyout
            impactMap={impactMap}
            Renderer={Renderer}
            onOpen={open}
            onClose={() => setPanel(undefined)}
          />
        )}
        {!selection && panel === 'timeline' && (
          <TimelineFlyout
            impactMap={impactMap}
            onOpenEvent={(id) => open({ kind: 'event', id })}
            onClose={() => setPanel(undefined)}
          />
        )}
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
