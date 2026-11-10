/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { useConversationFlyoutWidthProps } from '@kbn/agent-builder-plugin/public';
import {
  EuiAccordion,
  EuiBadge,
  EuiCode,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiIcon,
  EuiLink,
  EuiMarkdownFormat,
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
import {
  BUILT_IN_ENTITY_TYPES,
  canonicalEntityTypeId,
  resolveEntityIcon,
  resolveEntityMetadata,
  type EntityMetadataRow,
  type ImpactMapEntityType,
  type ImpactMapEvent,
  type ImpactMapEventKind,
  type InvestigationEvidence,
  type InvestigationImpactMapResponse,
} from '../../../../../common';
import { LazyEvidenceView } from '../../../../evidence';
import { useImpactEntityLink } from '../../../../impact_map/entity_link';
import type { ImpactEntityLinkTarget } from '../../../../types';
import { EntityMetadataTable } from './entity_metadata';
import { FilterPopover } from './event_filter_popover';

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
  anomaly: {
    label: i18n.translate('xpack.agenticInvestigations.impactMap.events.kind.anomaly', {
      defaultMessage: 'Anomaly',
    }),
    color: 'warning',
  },
  mitigation: {
    label: i18n.translate('xpack.agenticInvestigations.impactMap.events.kind.mitigation', {
      defaultMessage: 'Mitigation',
    }),
    color: 'success',
  },
  recovery: {
    label: i18n.translate('xpack.agenticInvestigations.impactMap.events.kind.recovery', {
      defaultMessage: 'Recovered',
    }),
    color: 'success',
  },
  customer_impact: {
    label: i18n.translate('xpack.agenticInvestigations.impactMap.events.kind.customerImpact', {
      defaultMessage: 'Customer impact',
    }),
    color: 'accent',
  },
  root_cause: {
    label: i18n.translate('xpack.agenticInvestigations.impactMap.events.kind.rootCause', {
      defaultMessage: 'Root cause',
    }),
    color: 'danger',
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
  { id: 'anomaly', icon: 'visLine', color: 'warning' },
  { id: 'customer_impact', icon: 'users', color: 'accent' },
  { id: 'root_cause', icon: 'crosshair', color: 'danger' },
  { id: 'investigation', icon: 'sparkles', color: 'primary' },
  { id: 'mitigation', icon: 'wrench', color: 'success' },
  { id: 'recovery', icon: 'checkCircleFill', color: 'success' },
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
const PREVIOUS_LABEL = i18n.translate('xpack.agenticInvestigations.impactMap.events.previous', {
  defaultMessage: 'Back',
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

export const EventKindBadge: React.FC<{ kind: ImpactMapEventKind; count?: number }> = ({
  kind,
  count,
}) => (
  <EuiBadge color={KINDS[kind].color}>
    {KINDS[kind].label}
    {count !== undefined && ` ${count}`}
  </EuiBadge>
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
 * A chart explains an event best with what led to it, and what was done about it, marked: the
 * event itself, and the changes, mitigations and responder actions inside the chart's window. What
 * the agent already annotated stays, and is not marked twice.
 */
export const withContextAnnotations = (
  evidence: InvestigationEvidence,
  event: ImpactMapEvent,
  allEvents: readonly ImpactMapEvent[] = []
): InvestigationEvidence => {
  const { chart } = evidence;
  if (!chart || chart.x_axis.type !== 'time') {
    return evidence;
  }
  const times = chart.series
    .flatMap(({ points }) => points.map(({ x }) => parseTime(x)))
    .filter((time): time is number => time !== undefined);
  const [start, end] = [Math.min(...times), Math.max(...times)];
  const own = (chart.annotations ?? []).map((annotation) =>
    event.kind === 'alert' && !annotation.tone
      ? { ...annotation, tone: 'danger' as const }
      : annotation
  );
  const marked = new Set(own.map(({ x }) => parseTime(x)));
  const context = allEvents
    .filter(({ id, kind, at }) => {
      const time = parseTime(at);
      return (
        id !== event.id &&
        (kind === 'change' ||
          kind === 'mitigation' ||
          kind === 'recovery' ||
          kind === 'response') &&
        time !== undefined &&
        time >= start &&
        time <= end &&
        !marked.has(time)
      );
    })
    .slice(-MAX_CONTEXT_ANNOTATIONS)
    .map(({ at, title, kind }) => ({
      x: at,
      label: title,
      ...(kind === 'mitigation' || kind === 'recovery' ? { tone: 'success' as const } : {}),
    }));
  const addsOwn = own.length === 0 || !marked.has(parseTime(event.at));
  const ownEvent = addsOwn
    ? [
        {
          x: event.at,
          ...(event.ends_at && { x_end: event.ends_at }),
          label: event.title,
          ...(event.kind === 'recovery' || event.kind === 'mitigation'
            ? { tone: 'success' as const }
            : event.kind === 'alert'
            ? { tone: 'danger' as const }
            : {}),
        },
      ]
    : [];
  return { ...evidence, chart: { ...chart, annotations: [...context, ...own, ...ownEvent] } };
};

const STATE_KINDS: readonly ImpactMapEventKind[] = [
  'customer_impact',
  'failure',
  'alert',
  'anomaly',
  'condition',
  'recovery',
];

/**
 * The map with every entity healthy whose latest event about its state is a recovery, so the map
 * shows what got better even when the agent did not re-send the entity's health.
 */
export const withRecoveredHealth = <
  T extends Pick<InvestigationImpactMapResponse, 'entities' | 'events'>
>(
  impactMap: T
): T => {
  const latest = new Map<string, ImpactMapEvent>();
  impactMap.events
    .filter(({ kind, entity_id: entityId }) => entityId && STATE_KINDS.includes(kind))
    .forEach((event) => {
      const seen = latest.get(event.entity_id ?? '');
      if (!seen || Date.parse(event.at) > Date.parse(seen.at)) {
        latest.set(event.entity_id ?? '', event);
      }
    });
  const recovered = new Set(
    [...latest.entries()].filter(([, { kind }]) => kind === 'recovery').map(([id]) => id)
  );
  if (recovered.size === 0) {
    return impactMap;
  }
  return {
    ...impactMap,
    entities: impactMap.entities.map((entity) =>
      recovered.has(entity.id)
        ? { ...entity, annotations: { ...entity.annotations, health: 'healthy' as const } }
        : entity
    ),
  };
};

const FACT_TYPE = i18n.translate('xpack.agenticInvestigations.impactMap.events.factType', {
  defaultMessage: 'Type',
});
const FACT_HAPPENED = i18n.translate('xpack.agenticInvestigations.impactMap.events.factHappened', {
  defaultMessage: 'Happened',
});
const FACT_DURATION = i18n.translate('xpack.agenticInvestigations.impactMap.events.factDuration', {
  defaultMessage: 'Lasted',
});
export const FACT_AFFECTS = i18n.translate(
  'xpack.agenticInvestigations.impactMap.events.factAffects',
  {
    defaultMessage: 'Affects',
  }
);

/** "2h 5m", "4m 10s" or "30s" for the time between two ISO timestamps. */
export const formatEventDuration = (from: string, to: string): string | undefined => {
  const start = parseTime(from);
  const end = parseTime(to);
  if (start === undefined || end === undefined || end <= start) {
    return undefined;
  }
  const seconds = Math.round((end - start) / 1000);
  const [h, m, sec] = [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60];
  return [h && `${h}h`, m && `${m}m`, !h && sec && `${sec}s`].filter(Boolean).join(' ') || '0s';
};

interface KeyFact {
  label: string;
  value: React.ReactNode;
  testSubj?: string;
  /** Too wide for the row (badges that wrap): shown on its own line under the short facts. */
  block?: boolean;
}

/**
 * The facts to read first. Short facts share a row with dividers between them; a block fact (one
 * that can wrap, like the entities an event affects) gets its own line under a rule, so nothing
 * wraps into a stray column.
 */
const KeyFacts: React.FC<{ facts: KeyFact[]; testSubj: string }> = ({ facts, testSubj }) => {
  const { euiTheme } = useEuiTheme();
  const rowFacts = facts.filter(({ block }) => !block);
  const blockFacts = facts.filter(({ block }) => block);
  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="m"
      borderRadius="m"
      data-test-subj={testSubj}
    >
      {rowFacts.length > 0 && (
        <EuiFlexGroup gutterSize="none" responsive={false} wrap>
          {rowFacts.map(({ label, value, testSubj: factTestSubj }, index) => (
            <EuiFlexItem
              key={label}
              grow={false}
              css={css`
                padding: ${euiTheme.size.xs} ${euiTheme.size.l};
                ${index === 0 ? 'padding-left: 0;' : `border-left: ${euiTheme.border.thin};`}
              `}
            >
              <EuiText size="s" color="subdued">
                {label}
              </EuiText>
              <EuiSpacer size="xs" />
              <EuiText size="s" data-test-subj={factTestSubj}>
                {value}
              </EuiText>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      )}
      {blockFacts.map(({ label, value, testSubj: factTestSubj }) => (
        <div
          key={label}
          css={css`
            ${rowFacts.length > 0
              ? `margin-top: ${euiTheme.size.m}; padding-top: ${euiTheme.size.m}; border-top: ${euiTheme.border.thin};`
              : ''}
          `}
        >
          <EuiText size="s" color="subdued">
            {label}
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiText size="s" data-test-subj={factTestSubj}>
            {value}
          </EuiText>
        </div>
      ))}
    </EuiPanel>
  );
};

/** An entity named as a badge with its icon; a click opens its flyout when one can open. */
const EntityBadge: React.FC<{
  entityId: string;
  impactMap: ImpactMapFlyoutMap;
  onOpenEntity?: (entityId: string) => void;
}> = ({ entityId, impactMap, onOpenEntity }) => {
  const entity = impactMap.entities.find(({ id }) => id === entityId);
  const type = impactMap.entity_types.find(({ id }) => id === entity?.type_id);
  const label = entity?.label ?? entityId;
  const iconType = getEntityIcon(type);
  const tooltip = i18n.translate(
    'xpack.agenticInvestigations.impactMap.events.entityBadgeTooltip',
    {
      defaultMessage:
        'Entity: {entity}{type, select, none {} other { (type: {type})}}{canOpen, select, yes { . Click to open it.} other {}}',
      values: {
        entity: label,
        type: type?.label ?? 'none',
        canOpen: onOpenEntity ? 'yes' : 'no',
      },
    }
  );
  return (
    <EuiToolTip content={tooltip} disableScreenReaderOutput>
      {onOpenEntity ? (
        <EuiBadge
          color="hollow"
          iconType={iconType}
          onClick={() => onOpenEntity(entityId)}
          onClickAriaLabel={i18n.translate(
            'xpack.agenticInvestigations.impactMap.events.openEntity',
            { defaultMessage: 'Open {entity}', values: { entity: label } }
          )}
          data-test-subj="agenticInvestigationsImpactMapEventEntityBadge"
        >
          {label}
        </EuiBadge>
      ) : (
        <EuiBadge
          color="hollow"
          iconType={iconType}
          data-test-subj="agenticInvestigationsImpactMapEventEntityBadge"
        >
          {label}
        </EuiBadge>
      )}
    </EuiToolTip>
  );
};

type ImpactMapFlyoutMap = ImpactMapEventsFlyoutProps['impactMap'];

/** What an event happened to: the entities as badges, in order, or the target in words. */
export const EventAffects: React.FC<{
  event: ImpactMapEvent;
  impactMap: ImpactMapFlyoutMap;
  onOpenEntity?: (entityId: string) => void;
}> = ({ event, impactMap, onOpenEntity }) => {
  const entityIds = getEventEntityIds(event, impactMap.relationships);
  // An event with no entity or relationship is about the investigation or the responders.
  if (entityIds.length === 0) {
    return <>{describeEventTarget(event, impactMap)}</>;
  }
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
      {entityIds.map((id, index) => (
        <React.Fragment key={id}>
          {index > 0 && (
            <EuiFlexItem grow={false}>
              <EuiIcon type="sortRight" size="s" aria-hidden={true} />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EntityBadge entityId={id} impactMap={impactMap} onOpenEntity={onOpenEntity} />
          </EuiFlexItem>
        </React.Fragment>
      ))}
    </EuiFlexGroup>
  );
};

const EventKeyFacts: React.FC<{
  event: ImpactMapEvent;
  impactMap: ImpactMapFlyoutMap;
  onOpenEntity?: (entityId: string) => void;
  /** Shown under the time: when it happened is what places the event on the timeline. */
  timelineAction?: React.ReactNode;
}> = ({ event, impactMap, onOpenEntity, timelineAction }) => {
  const duration = event.ends_at ? formatEventDuration(event.at, event.ends_at) : undefined;
  return (
    <KeyFacts
      testSubj="agenticInvestigationsImpactMapEventKeyFacts"
      facts={[
        { label: FACT_TYPE, value: <EventKindBadge kind={event.kind} /> },
        {
          label: FACT_HAPPENED,
          value: (
            <>
              <EventTime at={event.at} withDate />
              {timelineAction && <div>{timelineAction}</div>}
            </>
          ),
        },
        ...(duration ? [{ label: FACT_DURATION, value: duration }] : []),
        // An alert is about a rule, not about something it hurt.
        ...(event.kind === 'alert'
          ? []
          : [
              {
                label: FACT_AFFECTS,
                block: true,
                value: (
                  <EventAffects event={event} impactMap={impactMap} onOpenEntity={onOpenEntity} />
                ),
              },
            ]),
      ]}
    />
  );
};

/** What the entity is, then the featured facts the agent recorded about it. */
const EntityKeyFacts: React.FC<{
  metadata?: EntityMetadataRow[];
  impactMap: ImpactMapFlyoutMap;
  /** The entity being shown; a fact that names it is not linked back to it. */
  selfLabel?: string;
  onOpenEntity?: (entityId: string) => void;
}> = ({ metadata, impactMap, selfLabel, onOpenEntity }) => {
  const facts: KeyFact[] = (metadata ?? [])
    .filter(({ featured }) => featured)
    .map(({ key, label, value }) => {
      // A value that names another entity on the map is shown as that entity, to open it.
      const named =
        value !== selfLabel
          ? impactMap.entities.find((entity) => entity.label === value)
          : undefined;
      return {
        label,
        value: named ? (
          <EntityBadge entityId={named.id} impactMap={impactMap} onOpenEntity={onOpenEntity} />
        ) : (
          value
        ),
        testSubj: `agenticInvestigationsImpactMapFeatured-${key}`,
      };
    });
  return facts.length ? (
    <KeyFacts facts={facts} testSubj="agenticInvestigationsImpactMapFeaturedMetadata" />
  ) : null;
};

const KIND_ICONS: Record<string, string> = {
  service: 'apps',
  infrastructure: 'compute',
  dependency: 'database',
};

/** Type and sub-type as white badges with an icon each, as items for the title's row. */
const TypeBadges: React.FC<{ typeLabel?: string; icon?: string }> = ({ typeLabel, icon }) => {
  const [kind, subtype] = (typeLabel ?? '').split(' › ');
  return kind ? (
    <>
      <EuiFlexItem grow={false} data-test-subj="agenticInvestigationsImpactMapEventsType">
        <EuiToolTip
          content={i18n.translate('xpack.agenticInvestigations.impactMap.events.typeTooltip', {
            defaultMessage: 'Entity type: {type}',
            values: { type: kind },
          })}
          disableScreenReaderOutput
        >
          <EuiBadge color="hollow" iconType={KIND_ICONS[kind.toLowerCase()]} tabIndex={0}>
            {kind}
          </EuiBadge>
        </EuiToolTip>
      </EuiFlexItem>
      {subtype && (
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={i18n.translate('xpack.agenticInvestigations.impactMap.events.subtypeTooltip', {
              defaultMessage: 'Entity sub-type: {subtype}',
              values: { subtype },
            })}
            disableScreenReaderOutput
          >
            <EuiBadge color="hollow" iconType={icon} tabIndex={0}>
              {subtype}
            </EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </>
  ) : null;
};

/**
 * Top right of an entity's header: opens the solution's own flyout for the entity (the APM
 * service flyout for a service). Only there when the solution found it.
 */
const OpenInSolutionButton: React.FC<{ entity?: ImpactEntityLinkTarget }> = ({ entity }) => {
  const link = useImpactEntityLink(entity);
  const [isOpen, setIsOpen] = useState(false);
  const close = useCallback(() => setIsOpen(false), []);
  if (!link) {
    return null;
  }
  return (
    // Right of the title row, and clear of the flyout's close button.
    <EuiFlexItem grow style={{ alignItems: 'flex-end', paddingInlineEnd: 32 }}>
      <EuiButtonEmpty
        size="xs"
        iconType="eye"
        iconSide="right"
        onClick={() => setIsOpen(true)}
        data-test-subj="agenticInvestigationsImpactMapOpenInSolution"
      >
        {link.label}
      </EuiButtonEmpty>
      {isOpen &&
        link.renderFlyout({ onClose: close, historyKey: CONVERSATION_DETAILS_FLYOUT_HISTORY_KEY })}
    </EuiFlexItem>
  );
};

const EVIDENCE_LABEL = i18n.translate('xpack.agenticInvestigations.impactMap.events.evidence', {
  defaultMessage: 'Evidence',
});
const EVIDENCE_SOURCE = i18n.translate(
  'xpack.agenticInvestigations.impactMap.events.evidenceSource',
  { defaultMessage: 'Source' }
);
const SCOPE_LOCAL = i18n.translate('xpack.agenticInvestigations.impactMap.events.scopeLocal', {
  defaultMessage: 'Local: this Kibana is connected to it',
});
const SCOPE_REMOTE = i18n.translate('xpack.agenticInvestigations.impactMap.events.scopeRemote', {
  defaultMessage: 'Remote: somewhere else',
});
const EVIDENCE_INSTANCE = i18n.translate(
  'xpack.agenticInvestigations.impactMap.events.evidenceInstance',
  { defaultMessage: 'Where' }
);
const EVIDENCE_QUERY = i18n.translate(
  'xpack.agenticInvestigations.impactMap.events.evidenceQuery',
  {
    defaultMessage: 'Query',
  }
);
const EVIDENCE_API_CALL = i18n.translate(
  'xpack.agenticInvestigations.impactMap.events.evidenceApiCall',
  { defaultMessage: 'API call' }
);
const EVIDENCE_NONE = i18n.translate('xpack.agenticInvestigations.impactMap.events.evidenceNone', {
  defaultMessage: 'No data source was recorded for this event.',
});

/** Where an event's data came from and how it was asked for; closed until a reader wants it. */
const EventDataSource: React.FC<{ dataSource?: ImpactMapEvent['data_source'] }> = ({
  dataSource,
}) => {
  const accordionId = useGeneratedHtmlId({ prefix: 'impactMapEventEvidence' });
  const call = dataSource?.api_call;
  const callLine = [call?.method, call?.endpoint].filter(Boolean).join(' ');
  return (
    <EuiAccordion
      id={accordionId}
      buttonContent={<strong>{EVIDENCE_LABEL}</strong>}
      paddingSize="m"
      data-test-subj="agenticInvestigationsImpactMapEventDataSource"
    >
      {dataSource ? (
        <EuiDescriptionList
          compressed
          type="column"
          columnWidths={[1, 4]}
          listItems={[
            {
              title: EVIDENCE_SOURCE,
              description: (
                <span data-test-subj="agenticInvestigationsImpactMapEventDataSourceName">
                  {dataSource.name}
                </span>
              ),
            },
            ...(dataSource.instance || dataSource.scope || dataSource.base_url
              ? [
                  {
                    title: EVIDENCE_INSTANCE,
                    description: (
                      <span data-test-subj="agenticInvestigationsImpactMapEventDataSourceInstance">
                        {dataSource.scope && (
                          <EuiBadge color="hollow">
                            {dataSource.scope === 'local' ? SCOPE_LOCAL : SCOPE_REMOTE}
                          </EuiBadge>
                        )}{' '}
                        {dataSource.instance}
                        {dataSource.base_url && (
                          <>
                            <br />
                            <EuiCode transparentBackground>{dataSource.base_url}</EuiCode>
                          </>
                        )}
                      </span>
                    ),
                  },
                ]
              : []),
            ...(dataSource.query
              ? [
                  {
                    title: dataSource.query.language
                      ? `${EVIDENCE_QUERY} (${dataSource.query.language})`
                      : EVIDENCE_QUERY,
                    description: (
                      <EuiCodeBlock
                        language={
                          dataSource.query.language?.toLowerCase().includes('esql')
                            ? 'esql'
                            : 'text'
                        }
                        paddingSize="s"
                        fontSize="s"
                        isCopyable
                        whiteSpace="pre-wrap"
                        data-test-subj="agenticInvestigationsImpactMapEventDataSourceQuery"
                      >
                        {dataSource.query.text}
                      </EuiCodeBlock>
                    ),
                  },
                ]
              : []),
            ...(call
              ? [
                  {
                    title: call.type ? `${EVIDENCE_API_CALL} (${call.type})` : EVIDENCE_API_CALL,
                    description: (
                      <EuiCodeBlock
                        language={call.payload ? 'json' : 'text'}
                        paddingSize="s"
                        fontSize="s"
                        isCopyable
                        whiteSpace="pre-wrap"
                        data-test-subj="agenticInvestigationsImpactMapEventDataSourceApiCall"
                      >
                        {[callLine, call.payload].filter(Boolean).join('\n')}
                      </EuiCodeBlock>
                    ),
                  },
                ]
              : []),
          ]}
        />
      ) : (
        <EuiText size="s" color="subdued">
          {EVIDENCE_NONE}
        </EuiText>
      )}
    </EuiAccordion>
  );
};

/** Just the chart of an event, or its description when it has none: for a card that stays small. */
export const EventGlance: React.FC<{
  event: ImpactMapEvent;
  allEvents?: readonly ImpactMapEvent[];
}> = ({ event, allEvents }) =>
  event.evidence?.chart ? (
    <LazyEvidenceView
      // The chart's own title says what it plots; a caption under a card is noise.
      evidence={{
        ...withContextAnnotations(event.evidence, event, allEvents),
        description: undefined,
      }}
      referenceTime={event.at}
      // The card is the frame; a second outline inside it only eats the padding.
      outlineChart={false}
    />
  ) : event.description ? (
    <EuiMarkdownFormat textSize="s">{event.description}</EuiMarkdownFormat>
  ) : null;

export const EventDetail: React.FC<{
  event: ImpactMapEvent;
  allEvents?: readonly ImpactMapEvent[];
}> = ({ event, allEvents }) => (
  <div data-test-subj="agenticInvestigationsImpactMapEventDetail">
    <EuiTitle size="xxs">
      <h4>{DESCRIPTION_LABEL}</h4>
    </EuiTitle>
    <EuiSpacer size="xs" />
    {event.description ? (
      <EuiMarkdownFormat textSize="s">{event.description}</EuiMarkdownFormat>
    ) : (
      <EuiText size="s" color="subdued">
        <p>{NO_DESCRIPTION}</p>
      </EuiText>
    )}
    {event.evidence?.chart && (
      <>
        <EuiSpacer size="m" />
        <LazyEvidenceView
          // Nothing is written after the chart: its title says what it plots.
          evidence={{
            ...withContextAnnotations(event.evidence, event, allEvents),
            description: undefined,
          }}
          referenceTime={event.at}
        />
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
    {event.data_source && (
      <>
        <EuiSpacer size="m" />
        <EventDataSource dataSource={event.data_source} />
      </>
    )}
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
  // Chosen once, when the flyout opens. Opening a main flyout changes which flyout EUI reports as
  // the managed parent, so choosing again on a later render (every refresh of an investigation
  // that is still running) flipped it to a child, and the flyout closed under the reader.
  const [frame] = useState<'standalone' | 'main' | 'child'>(() => {
    if (standalone) {
      return 'standalone';
    }
    // A child of a managed flyout must have a named size and cannot go with a large parent, and
    // EUI throws otherwise. Under a large parent it opens as a main flyout over it instead.
    return asMainFlyout || getManagedParent()?.size === 'l' ? 'main' : 'child';
  });
  if (frame === 'standalone') {
    // Drawn inside the full-screen map and not as an EUI flyout: EUI sets a flyout's z-index
    // inline, below the map's, so a flyout opened over the map would sit behind it.
    return (
      <StandaloneEventsPanel onClose={onClose} titleId={titleId}>
        {children}
      </StandaloneEventsPanel>
    );
  }
  if (frame === 'main') {
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

export const STANDALONE_WIDTH = 'clamp(440px, 40vw, 640px)';

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
        overflow: hidden;
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

const childSize = (parentSize: unknown) => {
  if (parentSize === undefined) {
    return 380;
  }
  return parentSize === 'm' ? 's' : 'm';
};

const ChildEventsFlyout: React.FC<{
  onClose: () => void;
  titleId: string;
  children: React.ReactNode;
}> = ({ onClose, titleId, children }) => {
  // Read once: the parent's size is only true before this flyout opens.
  const [size] = useState(() => childSize(getManagedParent()?.size));
  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby={titleId}
      // Under a managed flyout the size has to be a named one. Not 'fill': EUI never stacks a fill
      // child, so beside a wide investigation flyout it was squeezed to a sliver. A medium child
      // goes beside a small parent, or stacks over it when the two don't fit; a medium parent
      // cannot have a medium child.
      size={size}
      ownFocus={false}
      data-test-subj="agenticInvestigationsImpactMapEventsFlyout"
    >
      {children}
    </EuiFlyout>
  );
};

/**
 * What an entity type is, as the map draws it. A type stored before `infrastructure` existed says
 * `service` even for a Kubernetes deployment; it has a named icon and no APM agent, which is how
 * the map already tells them apart.
 */
export const getEntityKind = (
  type?: ImpactMapEntityType
): ImpactMapEntityType['kind'] | undefined =>
  type?.kind === 'service' &&
  !type?.icon?.agent_name &&
  (type?.icon?.eui_icon || /kubernetes|k8s/i.test(`${type?.id} ${type?.label}`))
    ? 'infrastructure'
    : type?.kind;

/** An icon for an entity from its type: a named EUI icon, else one for its kind, else a generic one. */
export const getEntityIcon = (
  type?: ImpactMapEntityType,
  entityLabel?: string
): string => resolveEntityIcon(type, entityLabel);

/** The kind and the type under it: `Infrastructure › Kubernetes deployment`. */
export const getEntityTypeLabel = (
  storedType?: ImpactMapEntityType,
  entityName?: string
): string | undefined => {
  const kind = getEntityKindLabel(getEntityKind(storedType));
  if (!storedType || !kind) {
    return kind;
  }
  // A built-in type is named as the catalog names it ("Kubernetes node"), not as a map stored it
  // ("K8s"), so a person can tell what the thing is.
  const builtIn = BUILT_IN_ENTITY_TYPES.find(
    ({ id }) => id === canonicalEntityTypeId(storedType.id)
  );
  const type = builtIn ? { ...storedType, label: builtIn.label } : storedType;
  // A type that carries the entity's own name ('Shipping service') is not a sub-type.
  const name = entityName?.trim().toLowerCase();
  if (name && type.label.toLowerCase().includes(name)) {
    return kind;
  }
  return type.label.toLowerCase() === kind.toLowerCase() ? kind : `${kind} › ${type.label}`;
};

/** The stored kind of an entity as a label: Service, Dependency or Infrastructure. */
export const getEntityKindLabel = (kind?: string): string | undefined =>
  kind ? kind.charAt(0).toUpperCase() + kind.slice(1) : undefined;

const SEARCH_EVENTS = i18n.translate('xpack.agenticInvestigations.impactMap.searchEvents', {
  defaultMessage: 'Search events',
});

const TYPE_FILTER = i18n.translate('xpack.agenticInvestigations.impactMap.events.typeFilter', {
  defaultMessage: 'Event type',
});
const NO_MATCHING_EVENTS = i18n.translate(
  'xpack.agenticInvestigations.impactMap.events.noMatchingEvents',
  { defaultMessage: 'No events of this type.' }
);
const EVENTS_TAB = i18n.translate('xpack.agenticInvestigations.impactMap.events.eventsTab', {
  defaultMessage: 'Events',
});
const METADATA_TAB = i18n.translate('xpack.agenticInvestigations.impactMap.events.metadataTab', {
  defaultMessage: 'Metadata',
});
const NO_METADATA_TITLE = i18n.translate(
  'xpack.agenticInvestigations.impactMap.events.noMetadataTitle',
  { defaultMessage: 'No metadata yet' }
);
const NO_METADATA_BODY = i18n.translate(
  'xpack.agenticInvestigations.impactMap.events.noMetadataBody',
  {
    defaultMessage:
      'The investigation adds details that help you find this entity, such as its cloud, availability zone, cluster and namespace, the next time it updates the impact map.',
  }
);
const VIEW_IN_TIMELINE = i18n.translate(
  'xpack.agenticInvestigations.impactMap.events.viewInTimeline',
  { defaultMessage: 'View in timeline' }
);

export interface ImpactMapEventsFlyoutProps {
  /** What the events happened to, shown as the list's title. */
  title: string;
  /** An EUI icon for what the events happened to, and what kind of thing it is. */
  icon?: string;
  typeLabel?: string;
  /** What the entity is, in a sentence, shown under its title. */
  description?: string;
  /** The entity, for a link to where a solution shows it. */
  entityTarget?: ImpactEntityLinkTarget;
  /** Oldest first. */
  events: ImpactMapEvent[];
  /** What the agent recorded about an entity; adds a Metadata tab and leads with the featured. */
  metadata?: EntityMetadataRow[];
  /** Draws the events of the list; the list falls back to plain summaries. */
  renderEvents?: (events: ImpactMapEvent[], onOpen: (eventId: string) => void) => React.ReactNode;
  impactMap: Pick<
    InvestigationImpactMapResponse,
    'entities' | 'relationships' | 'events' | 'entity_types'
  >;
  /** Set by the flyout itself: the entity badges open the entity inside the same flyout. */
  onOpenEntity?: (entityId: string) => void;
  /** Opens on this event instead of the list. */
  initialEventId?: string;
  /** Set when this flyout was opened from another one that is still to come back to. */
  onBackToPrevious?: () => void;
  onClose: () => void;
  /**
   * Over the full-screen map the flyout stands alone, above it; otherwise it opens as a child of
   * the investigation flyout.
   */
  standalone?: boolean;
  /** Opens as a main flyout over the investigation flyout instead of as its child. */
  asMainFlyout?: boolean;
  /** Shows "View in investigation timeline" on an open event: the Timeline tab, scrolled to it. */
  onViewInTimeline?: (eventId: string) => void;
  /**
   * Changes when the flyout moves to another target. The flyout stays open and starts on the new
   * target's list: remounting it instead would close the one open flyout and open another.
   */
  targetKey?: string;
}

/**
 * The events of one entity or relationship: a list in time order, and the detail of one event
 * with the trend around it. Choosing an event replaces the list, and Back returns to it.
 */
export const ImpactMapEventsFlyout: React.FC<ImpactMapEventsFlyoutProps> = (props) => {
  const titleId = useGeneratedHtmlId({ prefix: 'impactMapEventsTitle' });
  const { standalone = false, asMainFlyout = false, onClose, title, targetKey } = props;
  // An entity chosen from an event is shown inside this same flyout: the window never closes or
  // reopens, and Back returns to what was open.
  const [openedEntities, setOpenedEntities] = useState<string[]>([]);
  const openedEntityId = openedEntities[openedEntities.length - 1];
  const content: ImpactMapEventsFlyoutProps & { titleId: string; onBack?: () => void } = {
    ...props,
    titleId,
    ...(openedEntityId
      ? {
          ...resolveEventsSelection({ kind: 'entity', id: openedEntityId }, props.impactMap),
          initialEventId: undefined,
          renderEvents: undefined,
          onViewInTimeline: undefined,
          onBack: () => setOpenedEntities((stack) => stack.slice(0, -1)),
        }
      : { onBack: props.onBackToPrevious }),
    onOpenEntity: (entityId: string) => setOpenedEntities((stack) => [...stack, entityId]),
  };
  return (
    <EventsFlyoutFrame
      standalone={standalone}
      asMainFlyout={asMainFlyout}
      onClose={onClose}
      titleId={titleId}
      menuTitle={title}
    >
      <EventsFlyoutContent key={`${targetKey ?? ''}|${openedEntities.join('>')}`} {...content} />
    </EventsFlyoutFrame>
  );
};

/**
 * The body of the flyout. Standalone, it is a plain scrolling box: EuiFlyoutBody fades the top and
 * bottom edge of what scrolls, which washed out the search box at the top of the list.
 */
const EventsBody: React.FC<{
  standalone: boolean;
  className?: string;
  children: React.ReactNode;
}> = ({ standalone, className, children }) =>
  standalone ? (
    <div className={className}>{children}</div>
  ) : (
    <EuiFlyoutBody>{children}</EuiFlyoutBody>
  );

const EventsFlyoutContent: React.FC<
  ImpactMapEventsFlyoutProps & { titleId: string; onBack?: () => void }
> = ({
  titleId,
  onBack,
  title,
  icon,
  typeLabel,
  description,
  entityTarget,
  renderEvents,
  events,
  metadata,
  impactMap,
  initialEventId,
  onClose,
  standalone = false,
  asMainFlyout = false,
  onViewInTimeline,
  onOpenEntity,
}) => {
  const { euiTheme } = useEuiTheme();
  const standaloneHeaderCss = css`
    flex: none;
    padding: ${euiTheme.size.base} ${euiTheme.size.xxl} ${euiTheme.size.base} ${euiTheme.size.base};
  `;
  const standaloneBodyCss = css`
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding: ${euiTheme.size.base};
  `;
  const [selectedId, setSelectedId] = useState(initialEventId);
  // An entity with facts but no events opens on its facts.
  const [tab, setTab] = useState<'timeline' | 'metadata'>(
    events.length === 0 && metadata?.length ? 'metadata' : 'timeline'
  );
  const selected = useMemo(() => events.find(({ id }) => id === selectedId), [events, selectedId]);
  // Opened on one event from the timeline, there is no list to go back to.
  const canGoBack = Boolean(selected) && (!initialEventId || events.length > 1);
  const showBack = canGoBack || Boolean(onBack);

  // Newest first: what happened last is what a person usually wants to see.
  const [kindFilter, setKindFilter] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');
  const allNewestFirst = useMemo(
    () => [...events].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)),
    [events]
  );
  const newestFirst = useMemo(() => {
    const needle = searchText.trim().toLowerCase();
    return allNewestFirst.filter(
      (event) =>
        (kindFilter.length === 0 || kindFilter.includes(event.kind)) &&
        (!needle || `${event.title} ${event.description ?? ''}`.toLowerCase().includes(needle))
    );
  }, [allNewestFirst, kindFilter, searchText]);
  const kindOptions = useMemo(
    () =>
      EVENT_GROUPS.map(({ id, label, icon: groupIcon, color }) => ({
        key: id,
        label,
        icon: groupIcon,
        iconColor: color,
        count: events.filter(({ kind }) => kind === id).length,
      })).filter(({ key, count }) => count > 0 || kindFilter.includes(key)),
    [events, kindFilter]
  );

  const viewInTimelineLink = onViewInTimeline && selected && (
    <EuiButtonEmpty
      size="xs"
      iconType="clock"
      flush="left"
      onClick={() => {
        // A main flyout opened over the investigation flyout steps back to it,
        // as Back does, instead of closing the whole stack.
        if (asMainFlyout) {
          getFlyoutManagerStore().goBack();
        }
        onViewInTimeline(selected.id);
      }}
      data-test-subj="agenticInvestigationsImpactMapViewInTimeline"
    >
      {VIEW_IN_TIMELINE}
    </EuiButtonEmpty>
  );

  return (
    <>
      <EuiFlyoutHeader
        hasBorder={Boolean(selected)}
        // Outside an EUI flyout there is no padding to inherit, and the close button sits top right.
        css={standalone ? standaloneHeaderCss : undefined}
      >
        {showBack && (
          <EuiButtonEmpty
            size="xs"
            iconType="chevronSingleLeft"
            flush="left"
            onClick={() => (canGoBack ? setSelectedId(undefined) : onBack?.())}
            data-test-subj="agenticInvestigationsImpactMapEventsBack"
          >
            {canGoBack ? BACK_LABEL : PREVIOUS_LABEL}
          </EuiButtonEmpty>
        )}
        {showBack && <EuiSpacer size="s" />}
        {selected ? (
          <>
            <EuiTitle size="s">
              <h2 id={titleId}>{selected.title}</h2>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EventKeyFacts
              event={selected}
              impactMap={impactMap}
              onOpenEntity={onOpenEntity}
              timelineAction={viewInTimelineLink}
            />
          </>
        ) : (
          <>
            <EuiFlexGroup
              gutterSize="s"
              alignItems="center"
              justifyContent="flexStart"
              responsive={false}
              wrap
            >
              {icon && (
                <EuiFlexItem grow={false}>
                  <EuiIcon type={icon} size="xl" aria-hidden={true} />
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiTitle size="s">
                  <h2 id={titleId}>{title}</h2>
                </EuiTitle>
              </EuiFlexItem>
              <TypeBadges typeLabel={typeLabel} icon={icon} />
              <OpenInSolutionButton entity={entityTarget} />
            </EuiFlexGroup>
            {description && (
              <>
                <EuiSpacer size="s" />
                <EuiText
                  size="s"
                  color="subdued"
                  data-test-subj="agenticInvestigationsImpactMapEntityDescription"
                >
                  <p>{description}</p>
                </EuiText>
              </>
            )}
            <EuiSpacer size="m" />
            {metadata?.some(({ featured }) => featured) && (
              <>
                <EntityKeyFacts
                  metadata={metadata}
                  impactMap={impactMap}
                  selfLabel={title}
                  onOpenEntity={onOpenEntity}
                />
                <EuiSpacer size="m" />
              </>
            )}
            <EuiFlexGroup
              gutterSize="s"
              alignItems="center"
              justifyContent="spaceBetween"
              responsive={false}
            >
              <EuiFlexItem grow={false}>
                <EuiTabs bottomBorder={false} size="s">
                  {metadata && (
                    <EuiTab
                      isSelected={tab === 'metadata'}
                      onClick={() => setTab('metadata')}
                      append={
                        <EuiNotificationBadge color="subdued">
                          {metadata.length}
                        </EuiNotificationBadge>
                      }
                      data-test-subj="agenticInvestigationsImpactMapMetadataTab"
                    >
                      {METADATA_TAB}
                    </EuiTab>
                  )}
                  <EuiTab
                    isSelected={tab === 'timeline'}
                    onClick={() => setTab('timeline')}
                    append={
                      <EuiNotificationBadge color="subdued">{events.length}</EuiNotificationBadge>
                    }
                    data-test-subj="agenticInvestigationsImpactMapTimelineTab"
                  >
                    {EVENTS_TAB}
                  </EuiTab>
                </EuiTabs>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
      </EuiFlyoutHeader>
      <EventsBody standalone={standalone} css={standaloneBodyCss}>
        {selected ? (
          <>
            <EventDetail event={selected} allEvents={impactMap.events} />
          </>
        ) : tab === 'metadata' ? (
          metadata?.length ? (
            <EntityMetadataTable rows={metadata} />
          ) : (
            <EuiEmptyPrompt
              iconType="list"
              titleSize="xs"
              title={<h3>{NO_METADATA_TITLE}</h3>}
              body={<p>{NO_METADATA_BODY}</p>}
              data-test-subj="agenticInvestigationsImpactMapNoMetadata"
            />
          )
        ) : events.length === 0 ? (
          <EuiEmptyPrompt
            iconType="clock"
            titleSize="xs"
            title={<h3>{EMPTY_TITLE}</h3>}
            body={<p>{EMPTY_BODY}</p>}
          />
        ) : (
          <>
            <EuiFlexGroup gutterSize="s" responsive={false} wrap>
              <EuiFlexItem
                css={css`
                  min-width: 160px;
                `}
              >
                <EuiFieldSearch
                  fullWidth
                  compressed
                  isClearable
                  placeholder={SEARCH_EVENTS}
                  aria-label={SEARCH_EVENTS}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  data-test-subj="agenticInvestigationsImpactMapEventsSearch"
                />
              </EuiFlexItem>
              {kindOptions.length > 0 && (
                <EuiFlexItem grow={false}>
                  <EuiFilterGroup compressed>
                    <FilterPopover
                      label={TYPE_FILTER}
                      options={kindOptions}
                      selected={kindFilter}
                      onChange={setKindFilter}
                      testSubj="agenticInvestigationsImpactMapEventsTypeFilter"
                    />
                  </EuiFilterGroup>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            {newestFirst.length === 0 ? (
              <EuiText
                size="s"
                color="subdued"
                data-test-subj="agenticInvestigationsImpactMapNoMatch"
              >
                <p>{NO_MATCHING_EVENTS}</p>
              </EuiText>
            ) : renderEvents ? (
              renderEvents(newestFirst, setSelectedId)
            ) : (
              <EuiFlexGroup direction="column" gutterSize="s">
                {newestFirst.map((event) => (
                  <EuiFlexItem key={event.id} grow={false}>
                    <EventSummary event={event} onClick={() => setSelectedId(event.id)} />
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            )}
          </>
        )}
      </EventsBody>
    </>
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
  impactMap: Pick<
    InvestigationImpactMapResponse,
    'entities' | 'relationships' | 'events' | 'entity_types'
  > &
    Partial<Pick<InvestigationImpactMapResponse, 'relationship_types'>>
): Pick<
  ImpactMapEventsFlyoutProps,
  | 'title'
  | 'events'
  | 'initialEventId'
  | 'icon'
  | 'typeLabel'
  | 'description'
  | 'metadata'
  | 'entityTarget'
> => {
  const { events, entities, relationships } = impactMap;
  if (selection.kind === 'entity') {
    const entity = entities.find(({ id }) => id === selection.id);
    const type = impactMap.entity_types.find(({ id }) => id === entity?.type_id);
    return {
      title: entity?.label ?? selection.id,
      icon: getEntityIcon(type),
      typeLabel: getEntityTypeLabel(type, entity?.label),
      description: entity?.description ?? type?.description,
      metadata: resolveEntityMetadata(entity, type),
      entityTarget: entity &&
        type && {
          id: entity.id,
          label: entity.label,
          kind: type.kind,
          metadata: entity.metadata?.map(({ key, value }) => ({ key, value })),
        },
      events: events.filter(({ entity_id: entityId }) => entityId === selection.id),
    };
  }
  if (selection.kind === 'relationship') {
    const relationship = relationships.find(({ id }) => id === selection.id);
    const labelOf = (id: string) => entities.find((entity) => entity.id === id)?.label ?? id;
    return {
      icon: 'sortRight',
      typeLabel: (impactMap.relationship_types ?? []).find(({ id }) => id === relationship?.type_id)
        ?.label,
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

/**
 * What a person has opened, one flyout after another: opening another thing adds to the stack,
 * Back removes the last, and closing clears it, so Back always returns to the previous flyout.
 */
export const useSelectionHistory = () => {
  const [history, setHistory] = useState<EventsSelection[]>([]);
  const open = useCallback(
    (next: EventsSelection) =>
      setHistory((stack) => {
        const last = stack[stack.length - 1];
        return last && last.kind === next.kind && last.id === next.id ? stack : [...stack, next];
      }),
    []
  );
  const back = useCallback(() => setHistory((stack) => stack.slice(0, -1)), []);
  const clear = useCallback(() => setHistory([]), []);
  return {
    current: history[history.length - 1],
    hasPrevious: history.length > 1,
    open,
    back,
    clear,
  };
};
