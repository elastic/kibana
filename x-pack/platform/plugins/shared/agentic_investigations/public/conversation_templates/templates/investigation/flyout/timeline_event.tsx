/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiAvatar,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedTime } from '@kbn/i18n-react';
import type {
  ImpactMapEvent,
  ImpactMapEventKind,
  InvestigationImpactMapResponse,
} from '../../../../../common';
import {
  EventKindBadge,
  describeEventTarget,
  getEntityIcon,
  getEventEntityIds,
  getEventGroup,
} from './impact_map_events';

const HAS_CHART = i18n.translate('xpack.agenticInvestigations.timeline.hasChart', {
  defaultMessage: 'Has a chart',
});
const SINCE_FIRST = i18n.translate('xpack.agenticInvestigations.timeline.sinceFirst', {
  defaultMessage: 'Time since the first event',
});

const MINUTE_MS = 60_000;

/** "57m" or "1h 12m". */
export const formatDuration = (ms: number): string => {
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

export const KindAvatar: React.FC<{ kind: ImpactMapEventKind }> = ({ kind }) => {
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

/** One event as the Timeline tab draws it, so the same event looks the same everywhere. */
export const TimelineEvent: React.FC<{
  event: ImpactMapEvent;
  impactMap: InvestigationImpactMapResponse;
  firstAt: number;
  selected: boolean;
  entityFilter?: string[];
  onOpen: () => void;
  /** Without it the entity badges are plain labels. */
  onToggleEntity?: (entityId: string) => void;
}> = ({ event, impactMap, firstAt, selected, entityFilter = [], onOpen, onToggleEntity }) => {
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
      data-event-id={event.id}
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
          event.kind === 'alert' ? null : (
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {describeEventTarget(event, impactMap)}
              </EuiText>
            </EuiFlexItem>
          )
        ) : (
          entityIds.map((entityId) => {
            const label = labelOf(entityId);
            const active = entityFilter.includes(entityId);
            const entity = impactMap.entities.find(({ id }) => id === entityId);
            const iconType = getEntityIcon(
              impactMap.entity_types.find(({ id }) => id === entity?.type_id)
            );
            return (
              <EuiFlexItem grow={false} key={entityId}>
                {onToggleEntity ? (
                  <EuiBadge
                    // Stays neutral when filtered: the filter bar already says it is on.
                    color="hollow"
                    iconType={iconType}
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
                    {active ? <strong>{label}</strong> : label}
                  </EuiBadge>
                ) : (
                  <EuiBadge
                    color="hollow"
                    iconType={iconType}
                    data-test-subj="agenticInvestigationsTimelineEntity"
                  >
                    {label}
                  </EuiBadge>
                )}
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
