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
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
  type EuiBadgeProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedDate, FormattedTime } from '@kbn/i18n-react';
import type {
  ImpactMapEvent,
  ImpactMapEventKind,
  InvestigationEvidence,
  InvestigationImpactMapResponse,
} from '../../../../../common';
import { LazyEvidenceView } from '../../../../evidence';

const KINDS: Record<ImpactMapEventKind, { label: string; color: EuiBadgeProps['color'] }> = {
  change: {
    label: i18n.translate('xpack.agenticInvestigations.impactMap.events.kind.change', {
      defaultMessage: 'Change',
    }),
    color: 'primary',
  },
  failure: {
    label: i18n.translate('xpack.agenticInvestigations.impactMap.events.kind.failure', {
      defaultMessage: 'Failure',
    }),
    color: 'danger',
  },
  condition: {
    label: i18n.translate('xpack.agenticInvestigations.impactMap.events.kind.condition', {
      defaultMessage: 'Condition',
    }),
    color: 'warning',
  },
  alert: {
    label: i18n.translate('xpack.agenticInvestigations.impactMap.events.kind.alert', {
      defaultMessage: 'Alert',
    }),
    color: 'danger',
  },
  mitigation: {
    label: i18n.translate('xpack.agenticInvestigations.impactMap.events.kind.mitigation', {
      defaultMessage: 'Mitigation',
    }),
    color: 'success',
  },
  customer_impact: {
    label: i18n.translate('xpack.agenticInvestigations.impactMap.events.kind.customerImpact', {
      defaultMessage: 'Customer impact',
    }),
    color: 'accent',
  },
  investigation: {
    label: i18n.translate('xpack.agenticInvestigations.impactMap.events.kind.investigation', {
      defaultMessage: 'Finding',
    }),
    color: 'primary',
  },
  response: {
    label: i18n.translate('xpack.agenticInvestigations.impactMap.events.kind.response', {
      defaultMessage: 'Response',
    }),
    color: 'hollow',
  },
};

/** How the timeline groups and filters events, each with the icon its rows carry. */
export const EVENT_GROUPS = [
  {
    id: 'symptom',
    label: i18n.translate('xpack.agenticInvestigations.impactMap.events.group.symptom', {
      defaultMessage: 'Symptom',
    }),
    icon: 'warning',
    color: 'warning',
    kinds: ['failure', 'condition', 'alert', 'customer_impact'],
  },
  {
    id: 'contributing',
    label: i18n.translate('xpack.agenticInvestigations.impactMap.events.group.contributing', {
      defaultMessage: 'Contributing factor',
    }),
    icon: 'bug',
    color: 'danger',
    kinds: ['change'],
  },
  {
    id: 'investigation',
    label: i18n.translate('xpack.agenticInvestigations.impactMap.events.group.investigation', {
      defaultMessage: 'Investigation',
    }),
    icon: 'sparkles',
    color: 'primary',
    kinds: ['investigation'],
  },
  {
    id: 'action',
    label: i18n.translate('xpack.agenticInvestigations.impactMap.events.group.action', {
      defaultMessage: 'Action',
    }),
    icon: 'wrench',
    color: 'primary',
    kinds: ['mitigation', 'response'],
  },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  icon: string;
  color: 'warning' | 'danger' | 'primary';
  kinds: readonly ImpactMapEventKind[];
}>;

export type EventGroup = (typeof EVENT_GROUPS)[number];
export type EventGroupId = EventGroup['id'];

export const getEventGroup = (kind: ImpactMapEventKind): EventGroup =>
  EVENT_GROUPS.find(({ kinds }) => (kinds as readonly ImpactMapEventKind[]).includes(kind)) ??
  EVENT_GROUPS[0];

/** The entity ids an event touches: its entity, or both ends of its relationship. */
export const getEventEntityIds = (
  { entity_id: entityId, relationship_id: relationshipId }: ImpactMapEvent,
  relationships: InvestigationImpactMapResponse['relationships']
): string[] => {
  if (entityId) {
    return [entityId];
  }
  if (!relationshipId) {
    return [];
  }
  const relationship = relationships.find(({ id }) => id === relationshipId);
  return relationship
    ? [relationship.source_id, relationship.target_id]
    : relationshipId.split('->').filter(Boolean);
};

const INVESTIGATION_TARGET = i18n.translate(
  'xpack.agenticInvestigations.impactMap.events.investigationTarget',
  { defaultMessage: 'Investigation' }
);
const RESPONSE_TARGET = i18n.translate(
  'xpack.agenticInvestigations.impactMap.events.responseTarget',
  { defaultMessage: 'Responders' }
);
const EMPTY_TITLE = i18n.translate('xpack.agenticInvestigations.impactMap.events.emptyTitle', {
  defaultMessage: 'No events yet',
});
const EMPTY_BODY = i18n.translate('xpack.agenticInvestigations.impactMap.events.emptyBody', {
  defaultMessage: 'The agent adds what happened here as it finds it.',
});
const BACK_LABEL = i18n.translate('xpack.agenticInvestigations.impactMap.events.back', {
  defaultMessage: 'All events',
});
const DESCRIPTION_LABEL = i18n.translate(
  'xpack.agenticInvestigations.impactMap.events.description',
  {
    defaultMessage: 'Description',
  }
);
const NO_DESCRIPTION = i18n.translate(
  'xpack.agenticInvestigations.impactMap.events.noDescription',
  {
    defaultMessage: 'No description recorded.',
  }
);
const TREND_LABEL = i18n.translate('xpack.agenticInvestigations.impactMap.events.trend', {
  defaultMessage: 'Trend',
});
const NO_CHART = i18n.translate('xpack.agenticInvestigations.impactMap.events.noChart', {
  defaultMessage: 'No chart yet: the agent had no numbers for this event.',
});
const LINKS_LABEL = i18n.translate('xpack.agenticInvestigations.impactMap.events.links', {
  defaultMessage: 'Links',
});

export const EventKindBadge: React.FC<{ kind: ImpactMapEventKind }> = ({ kind }) => (
  <EuiBadge color={KINDS[kind].color}>{KINDS[kind].label}</EuiBadge>
);

/** What an event happened to, named as the map names it. */
export const describeEventTarget = (
  { kind, entity_id: entityId, relationship_id: relationshipId }: ImpactMapEvent,
  impactMap: Pick<InvestigationImpactMapResponse, 'entities' | 'relationships'>
): string => {
  const labelOf = (id: string) =>
    impactMap.entities.find((entity) => entity.id === id)?.label ?? id;
  if (entityId) {
    return labelOf(entityId);
  }
  if (relationshipId) {
    const relationship = impactMap.relationships.find(({ id }) => id === relationshipId);
    const [source, target] = relationship
      ? [relationship.source_id, relationship.target_id]
      : relationshipId.split('->');
    return target ? `${labelOf(source)} → ${labelOf(target)}` : relationshipId;
  }
  return kind === 'investigation' ? INVESTIGATION_TARGET : RESPONSE_TARGET;
};

export const EventTime: React.FC<{ at: string; withDate?: boolean }> = ({ at, withDate }) => {
  const date = new Date(at);
  return (
    <>
      {withDate && (
        <>
          <FormattedDate value={date} day="numeric" month="short" />{' '}
        </>
      )}
      <FormattedTime value={date} hour="2-digit" minute="2-digit" second="2-digit" />
    </>
  );
};

/** One event as a clickable summary line: when, what kind and what happened. */
export const EventSummary: React.FC<{
  event: ImpactMapEvent;
  target?: string;
  onClick: () => void;
}> = ({ event, target, onClick }) => (
  <EuiPanel
    hasBorder
    hasShadow={false}
    paddingSize="s"
    onClick={onClick}
    data-test-subj="agenticInvestigationsImpactMapEvent"
  >
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          <EventTime at={event.at} withDate />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EventKindBadge kind={event.kind} />
      </EuiFlexItem>
      {target && (
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {target}
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
    <EuiSpacer size="xs" />
    <EuiText size="s">
      <strong>{event.title}</strong>
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

const MAX_CONTEXT_ANNOTATIONS = 4;

const parseTime = (value: string): number | undefined => {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

/**
 * A chart explains an event best with what led to it marked. A time chart the agent left without
 * annotations gets one at the event and one at each of the latest changes and mitigations in its
 * window, so a deploy shows up just before the line it broke.
 */
export const withContextAnnotations = (
  evidence: InvestigationEvidence,
  event: ImpactMapEvent,
  allEvents: readonly ImpactMapEvent[] = []
): InvestigationEvidence => {
  const { chart } = evidence;
  if (!chart || chart.x_axis.type !== 'time' || chart.annotations?.length) {
    return evidence;
  }
  const times = chart.series
    .flatMap(({ points }) => points.map(({ x }) => parseTime(x)))
    .filter((time): time is number => time !== undefined);
  const [start, end] = [Math.min(...times), Math.max(...times)];
  const context = allEvents
    .filter(({ id, kind, at }) => {
      const time = parseTime(at);
      return (
        id !== event.id &&
        (kind === 'change' || kind === 'mitigation') &&
        time !== undefined &&
        time >= start &&
        time <= end
      );
    })
    .slice(-MAX_CONTEXT_ANNOTATIONS)
    .map(({ at, title }) => ({ x: at, label: title }));
  const own = { x: event.at, ...(event.ends_at && { x_end: event.ends_at }), label: event.title };
  return { ...evidence, chart: { ...chart, annotations: [...context, own] } };
};

const EventDetail: React.FC<{
  event: ImpactMapEvent;
  target: string;
  allEvents?: readonly ImpactMapEvent[];
}> = ({ event, target, allEvents }) => (
  <div data-test-subj="agenticInvestigationsImpactMapEventDetail">
    <EuiText size="xs" color="subdued">
      <EventTime at={event.at} withDate />
      {event.ends_at && (
        <>
          {' – '}
          <EventTime at={event.ends_at} />
        </>
      )}
      {' · '}
      {target}
    </EuiText>
    <EuiSpacer size="m" />
    <EuiTitle size="xxs">
      <h4>{DESCRIPTION_LABEL}</h4>
    </EuiTitle>
    <EuiSpacer size="xs" />
    <EuiText size="s" color={event.description ? undefined : 'subdued'}>
      <p>{event.description ?? NO_DESCRIPTION}</p>
    </EuiText>
    <EuiSpacer size="m" />
    <EuiTitle size="xxs">
      <h4>{TREND_LABEL}</h4>
    </EuiTitle>
    <EuiSpacer size="xs" />
    {event.evidence?.chart ? (
      <LazyEvidenceView evidence={withContextAnnotations(event.evidence, event, allEvents)} />
    ) : (
      <EuiText size="s" color="subdued" data-test-subj="agenticInvestigationsImpactMapEventNoChart">
        <p>{NO_CHART}</p>
      </EuiText>
    )}
    {event.links?.length ? (
      <>
        <EuiSpacer size="m" />
        <EuiTitle size="xxs">
          <h4>{LINKS_LABEL}</h4>
        </EuiTitle>
        <EuiSpacer size="xs" />
        {event.links.map(({ label, url }) => (
          <EuiText size="s" key={url}>
            <EuiLink href={url} target="_blank" external>
              {label}
            </EuiLink>
          </EuiText>
        ))}
      </>
    ) : null}
  </div>
);

export interface ImpactMapEventsFlyoutProps {
  /** What the events happened to, shown as the list's title. */
  title: string;
  /** Oldest first. */
  events: ImpactMapEvent[];
  impactMap: Pick<InvestigationImpactMapResponse, 'entities' | 'relationships' | 'events'>;
  /** Opens on this event instead of the list. */
  initialEventId?: string;
  onClose: () => void;
  /**
   * Over the full-screen map the flyout stands alone, above it; otherwise it opens as a child of
   * the investigation flyout.
   */
  standalone?: boolean;
}

/**
 * The events of one entity or relationship: a list in time order, and the detail of one event
 * with the trend around it. Choosing an event replaces the list, and Back returns to it.
 */
export const ImpactMapEventsFlyout: React.FC<ImpactMapEventsFlyoutProps> = ({
  title,
  events,
  impactMap,
  initialEventId,
  onClose,
  standalone = false,
}) => {
  const { euiTheme } = useEuiTheme();
  const titleId = useGeneratedHtmlId({ prefix: 'impactMapEventsTitle' });
  const [selectedId, setSelectedId] = useState(initialEventId);
  const selected = useMemo(() => events.find(({ id }) => id === selectedId), [events, selectedId]);
  // Opened on one event from the timeline, there is no list to go back to.
  const canGoBack = Boolean(selected) && (!initialEventId || events.length > 1);

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby={titleId}
      size="s"
      ownFocus={standalone}
      data-test-subj="agenticInvestigationsImpactMapEventsFlyout"
      {...(standalone
        ? {
            session: 'never' as const,
            type: 'overlay' as const,
            css: css`
              z-index: ${Number(euiTheme.levels.modal) + 1};
            `,
          }
        : {})}
    >
      <EuiFlyoutHeader hasBorder>
        {canGoBack && (
          <EuiButtonEmpty
            size="xs"
            iconType="chevronSingleLeft"
            flush="left"
            onClick={() => setSelectedId(undefined)}
            data-test-subj="agenticInvestigationsImpactMapEventsBack"
          >
            {BACK_LABEL}
          </EuiButtonEmpty>
        )}
        <EuiTitle size="s">
          <h2 id={titleId}>{selected ? selected.title : title}</h2>
        </EuiTitle>
        {selected && (
          <>
            <EuiSpacer size="xs" />
            <EventKindBadge kind={selected.kind} />
          </>
        )}
        {!selected && (
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.agenticInvestigations.impactMap.events.count', {
              defaultMessage: '{count, plural, one {# event} other {# events}}, oldest first',
              values: { count: events.length },
            })}
          </EuiText>
        )}
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {selected ? (
          <EventDetail
            event={selected}
            target={describeEventTarget(selected, impactMap)}
            allEvents={impactMap.events}
          />
        ) : events.length === 0 ? (
          <EuiEmptyPrompt
            iconType="clock"
            titleSize="xs"
            title={<h3>{EMPTY_TITLE}</h3>}
            body={<p>{EMPTY_BODY}</p>}
          />
        ) : (
          <EuiFlexGroup direction="column" gutterSize="s">
            {events.map((event) => (
              <EuiFlexItem key={event.id} grow={false}>
                <EventSummary event={event} onClick={() => setSelectedId(event.id)} />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

/** What a click on the map or the timeline asks to show. */
export type EventsSelection =
  | { kind: 'entity'; id: string }
  | { kind: 'relationship'; id: string }
  | { kind: 'event'; id: string };

/** The title and events a selection opens on. */
export const resolveEventsSelection = (
  selection: EventsSelection,
  impactMap: InvestigationImpactMapResponse
): Pick<ImpactMapEventsFlyoutProps, 'title' | 'events' | 'initialEventId'> => {
  const { events, entities, relationships } = impactMap;
  if (selection.kind === 'entity') {
    return {
      title: entities.find(({ id }) => id === selection.id)?.label ?? selection.id,
      events: events.filter(({ entity_id: entityId }) => entityId === selection.id),
    };
  }
  if (selection.kind === 'relationship') {
    const relationship = relationships.find(({ id }) => id === selection.id);
    const labelOf = (id: string) => entities.find((entity) => entity.id === id)?.label ?? id;
    return {
      title: relationship
        ? `${labelOf(relationship.source_id)} → ${labelOf(relationship.target_id)}`
        : selection.id,
      events: events.filter(({ relationship_id: id }) => id === selection.id),
    };
  }
  const event = events.find(({ id }) => id === selection.id);
  return {
    title: event?.title ?? '',
    events: event ? [event] : [],
    initialEventId: selection.id,
  };
};
