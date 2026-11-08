/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { useConversationFlyoutWidthProps } from '@kbn/agent-builder-plugin/public';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiIcon,
  EuiLink,
  EuiNotificationBadge,
  EuiPanel,
  EuiPortal,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  EuiToolTip,
  getFlyoutManagerStore,
  useEuiTheme,
  useGeneratedHtmlId,
  type EuiBadgeProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CONVERSATION_DETAILS_FLYOUT_HISTORY_KEY } from '@kbn/agent-builder-browser';
import { FormattedDate, FormattedTime } from '@kbn/i18n-react';
import type {
  ImpactMapEntityType,
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

/** How each stored kind of event is drawn on the timeline and offered as a filter. */
export const EVENT_GROUPS = [
  { id: 'change', icon: 'merge', color: 'danger' },
  { id: 'failure', icon: 'error', color: 'danger' },
  { id: 'condition', icon: 'warning', color: 'warning' },
  { id: 'alert', icon: 'bell', color: 'warning' },
  { id: 'customer_impact', icon: 'users', color: 'accent' },
  { id: 'investigation', icon: 'sparkles', color: 'primary' },
  { id: 'mitigation', icon: 'wrench', color: 'success' },
  { id: 'response', icon: 'megaphone', color: 'primary' },
].map((entry) => ({
  ...entry,
  label: KINDS[entry.id as ImpactMapEventKind].label,
})) as ReadonlyArray<{
  id: ImpactMapEventKind;
  label: string;
  icon: string;
  color: 'primary' | 'success' | 'warning' | 'danger' | 'accent';
}>;

export type EventGroup = (typeof EVENT_GROUPS)[number];
export type EventGroupId = EventGroup['id'];

export const getEventGroup = (kind: ImpactMapEventKind): EventGroup =>
  EVENT_GROUPS.find(({ id }) => id === kind) ?? EVENT_GROUPS[0];

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
const CLOSE_LABEL = i18n.translate('xpack.agenticInvestigations.impactMap.events.close', {
  defaultMessage: 'Close',
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
    {event.evidence?.chart && (
      <>
        <EuiSpacer size="m" />
        <LazyEvidenceView evidence={withContextAnnotations(event.evidence, event, allEvents)} />
      </>
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

/**
 * Where the flyout sits. Over the full-screen map it stands alone above it. In Agent Builder, and
 * from the Timeline, it is a new main flyout in the conversation details history group, like the
 * hypothesis tree: it shows over the investigation flyout and the menu offers Back to it.
 * Elsewhere it is a child of the investigation flyout, as an SLO opens from the SLO flyout.
 */
const EventsFlyoutFrame: React.FC<{
  standalone: boolean;
  asMainFlyout: boolean;
  onClose: () => void;
  titleId: string;
  menuTitle: string;
  children: React.ReactNode;
}> = ({ standalone, asMainFlyout, onClose, titleId, menuTitle, children }) => {
  if (standalone) {
    // Drawn inside the full-screen map and not as an EUI flyout: EUI sets a flyout's z-index
    // inline, below the map's, so a flyout opened over the map would sit behind it.
    return (
      <StandaloneEventsPanel onClose={onClose} titleId={titleId}>
        {children}
      </StandaloneEventsPanel>
    );
  }
  // A child of a managed flyout must have a named size and cannot go with a large parent, and
  // EUI throws otherwise. Under a large parent it opens as a main flyout over it instead.
  if (asMainFlyout || getManagedParent()?.size === 'l') {
    return (
      <MainEventsFlyout onClose={onClose} titleId={titleId} menuTitle={menuTitle}>
        {children}
      </MainEventsFlyout>
    );
  }
  return (
    <ChildEventsFlyout onClose={onClose} titleId={titleId}>
      {children}
    </ChildEventsFlyout>
  );
};

export const STANDALONE_WIDTH = '440px';

/** A flyout-like panel on the right of the full-screen map; Escape closes it. */
const StandaloneEventsPanel: React.FC<{
  onClose: () => void;
  titleId: string;
  children: React.ReactNode;
}> = ({ onClose, titleId, children }) => {
  const { euiTheme } = useEuiTheme();
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);
  return (
    <div
      role="dialog"
      aria-labelledby={titleId}
      data-test-subj="agenticInvestigationsImpactMapEventsFlyout"
      css={css`
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        z-index: 1;
        width: ${STANDALONE_WIDTH};
        max-width: 100%;
        display: flex;
        flex-direction: column;
        background: ${euiTheme.colors.backgroundBasePlain};
        border-left: ${euiTheme.border.thin};
        box-shadow: ${euiTheme.shadows?.l?.down ?? 'none'};
      `}
    >
      <EuiToolTip
        content={CLOSE_LABEL}
        disableScreenReaderOutput
        anchorProps={{
          css: css`
            position: absolute;
            top: ${euiTheme.size.s};
            right: ${euiTheme.size.s};
            z-index: 1;
          `,
        }}
      >
        <EuiButtonIcon
          iconType="cross"
          aria-label={CLOSE_LABEL}
          onClick={onClose}
          data-test-subj="agenticInvestigationsImpactMapEventsClose"
        />
      </EuiToolTip>
      {children}
    </div>
  );
};

/**
 * A new main flyout over the investigation flyout, at the investigation flyout's width: it uses
 * the same width rules and the same remembered width, so resizing either resizes both next time.
 */
const MainEventsFlyout: React.FC<{
  onClose: () => void;
  titleId: string;
  menuTitle: string;
  children: React.ReactNode;
}> = ({ onClose, titleId, menuTitle, children }) => {
  const widthProps = useConversationFlyoutWidthProps();
  return (
    // Rendered in a portal because the details flyout's transformed body would contain it.
    <EuiPortal>
      <EuiFlyout
        onClose={onClose}
        aria-labelledby={titleId}
        session="start"
        historyKey={CONVERSATION_DETAILS_FLYOUT_HISTORY_KEY}
        flyoutMenuProps={{ title: menuTitle, hideTitle: true }}
        type="push"
        {...widthProps}
        data-test-subj="agenticInvestigationsImpactMapEventsFlyout"
      >
        {children}
      </EuiFlyout>
    </EuiPortal>
  );
};

/** The main flyout of the open flyout session, when EUI is managing one. */
const getManagedParent = () => {
  const { sessions, flyouts } = getFlyoutManagerStore().getState();
  const mainId = sessions[sessions.length - 1]?.mainFlyoutId;
  return flyouts.find(({ flyoutId }) => flyoutId === mainId);
};

const ChildEventsFlyout: React.FC<{
  onClose: () => void;
  titleId: string;
  children: React.ReactNode;
}> = ({ onClose, titleId, children }) => {
  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby={titleId}
      // Under a managed flyout the size has to be a named one.
      size={getManagedParent() ? 's' : 380}
      ownFocus={false}
      data-test-subj="agenticInvestigationsImpactMapEventsFlyout"
    >
      {children}
    </EuiFlyout>
  );
};

const DEPENDENCY_ICONS: Record<string, string> = {
  db: 'database',
  messaging: 'package',
  cache: 'database',
  external: 'globe',
};

/** Icons EUI is known to have, so a name the agent made up never draws a broken image. */
const KNOWN_ICONS = new Set([
  'logoKubernetes',
  'logoDocker',
  'logoAWS',
  'logoAzure',
  'logoGCP',
  'logoCloud',
  'database',
  'globe',
  'compute',
  'apps',
  'package',
]);

/** An icon for an entity from its type: a named EUI icon, else one for its kind, else a generic one. */
export const getEntityIcon = (type?: ImpactMapEntityType): string => {
  const named = type?.icon?.eui_icon;
  if (named && KNOWN_ICONS.has(named)) {
    return named;
  }
  if (/kubernetes|k8s/i.test(`${type?.id} ${type?.label}`)) {
    return 'logoKubernetes';
  }
  if (type?.kind === 'dependency') {
    return DEPENDENCY_ICONS[type.icon?.span_type ?? ''] ?? 'globe';
  }
  return type?.kind === 'infrastructure' ? 'compute' : 'apps';
};

/** The stored kind of an entity as a label: Service, Dependency or Infrastructure. */
export const getEntityKindLabel = (kind?: string): string | undefined =>
  kind ? kind.charAt(0).toUpperCase() + kind.slice(1) : undefined;

const TIMELINE_TAB = i18n.translate('xpack.agenticInvestigations.impactMap.events.timelineTab', {
  defaultMessage: 'Timeline',
});
const TYPE_LABEL = i18n.translate('xpack.agenticInvestigations.impactMap.events.type', {
  defaultMessage: 'Type',
});
const VIEW_IN_TIMELINE = i18n.translate(
  'xpack.agenticInvestigations.impactMap.events.viewInTimeline',
  { defaultMessage: 'View in investigation timeline' }
);

export interface ImpactMapEventsFlyoutProps {
  /** What the events happened to, shown as the list's title. */
  title: string;
  /** An EUI icon for what the events happened to, and what kind of thing it is. */
  icon?: string;
  typeLabel?: string;
  /** Oldest first. */
  events: ImpactMapEvent[];
  /** Draws the events of the list; the list falls back to plain summaries. */
  renderEvents?: (events: ImpactMapEvent[], onOpen: (eventId: string) => void) => React.ReactNode;
  impactMap: Pick<InvestigationImpactMapResponse, 'entities' | 'relationships' | 'events'>;
  /** Opens on this event instead of the list. */
  initialEventId?: string;
  onClose: () => void;
  /**
   * Over the full-screen map the flyout stands alone, above it; otherwise it opens as a child of
   * the investigation flyout.
   */
  standalone?: boolean;
  /** Opens as a main flyout over the investigation flyout instead of as its child. */
  asMainFlyout?: boolean;
  /** Shows a "View in timeline" action that opens the Timeline tab filtered by this target. */
  onViewInTimeline?: () => void;
}

/**
 * The events of one entity or relationship: a list in time order, and the detail of one event
 * with the trend around it. Choosing an event replaces the list, and Back returns to it.
 */
export const ImpactMapEventsFlyout: React.FC<ImpactMapEventsFlyoutProps> = ({
  title,
  icon,
  typeLabel,
  renderEvents,
  events,
  impactMap,
  initialEventId,
  onClose,
  standalone = false,
  asMainFlyout = false,
  onViewInTimeline,
}) => {
  const titleId = useGeneratedHtmlId({ prefix: 'impactMapEventsTitle' });
  const [selectedId, setSelectedId] = useState(initialEventId);
  const selected = useMemo(() => events.find(({ id }) => id === selectedId), [events, selectedId]);
  // Opened on one event from the timeline, there is no list to go back to.
  const canGoBack = Boolean(selected) && (!initialEventId || events.length > 1);

  return (
    <EventsFlyoutFrame
      standalone={standalone}
      asMainFlyout={asMainFlyout}
      onClose={onClose}
      titleId={titleId}
      menuTitle={title}
    >
      <EuiFlyoutHeader hasBorder={Boolean(selected)}>
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
        {selected ? (
          <>
            <EuiTitle size="s">
              <h2 id={titleId}>{selected.title}</h2>
            </EuiTitle>
            <EuiSpacer size="xs" />
            <EventKindBadge kind={selected.kind} />
          </>
        ) : (
          <>
            <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
              {icon && (
                <EuiFlexItem grow={false}>
                  <EuiIcon type={icon} size="xl" aria-hidden={true} />
                </EuiFlexItem>
              )}
              <EuiFlexItem>
                <EuiTitle size="s">
                  <h2 id={titleId}>{title}</h2>
                </EuiTitle>
                {typeLabel && (
                  <EuiText
                    size="xs"
                    color="subdued"
                    data-test-subj="agenticInvestigationsImpactMapEventsType"
                  >
                    {TYPE_LABEL}: {typeLabel}
                  </EuiText>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <EuiFlexGroup
              gutterSize="s"
              alignItems="center"
              justifyContent="spaceBetween"
              responsive={false}
            >
              <EuiFlexItem grow={false}>
                <EuiTabs bottomBorder={false} size="s">
                  <EuiTab
                    isSelected
                    append={
                      <EuiNotificationBadge color="subdued">{events.length}</EuiNotificationBadge>
                    }
                  >
                    {TIMELINE_TAB}
                  </EuiTab>
                </EuiTabs>
              </EuiFlexItem>
              {onViewInTimeline && events.length > 0 && (
                <EuiFlexItem grow={false}>
                  <EuiLink
                    onClick={() => {
                      // A main flyout opened over the investigation flyout steps back to it,
                      // as Back does, instead of closing the whole stack.
                      if (asMainFlyout) {
                        getFlyoutManagerStore().goBack();
                      }
                      onViewInTimeline();
                    }}
                    data-test-subj="agenticInvestigationsImpactMapViewInTimeline"
                  >
                    <EuiText size="xs" component="span">
                      {VIEW_IN_TIMELINE}
                    </EuiText>
                  </EuiLink>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </>
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
        ) : renderEvents ? (
          renderEvents(events, setSelectedId)
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
    </EventsFlyoutFrame>
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
): Pick<
  ImpactMapEventsFlyoutProps,
  'title' | 'events' | 'initialEventId' | 'icon' | 'typeLabel'
> => {
  const { events, entities, relationships } = impactMap;
  if (selection.kind === 'entity') {
    const entity = entities.find(({ id }) => id === selection.id);
    const type = impactMap.entity_types.find(({ id }) => id === entity?.type_id);
    return {
      title: entity?.label ?? selection.id,
      icon: getEntityIcon(type),
      typeLabel: getEntityKindLabel(type?.kind),
      events: events.filter(({ entity_id: entityId }) => entityId === selection.id),
    };
  }
  if (selection.kind === 'relationship') {
    const relationship = relationships.find(({ id }) => id === selection.id);
    const labelOf = (id: string) => entities.find((entity) => entity.id === id)?.label ?? id;
    return {
      icon: 'sortRight',
      typeLabel: impactMap.relationship_types.find(({ id }) => id === relationship?.type_id)?.label,
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
