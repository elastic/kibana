/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { InvestigationImpactMapResponse } from '../../common';
import { compareEventsByTime, formatTimelineClock, resolveEntityMetadata } from '../../common';
import {
  getEntityIcon,
  getEntityTypeLabel,
  getEventEntityIds,
} from '../conversation_templates/templates/investigation/flyout/impact_map_events';
import { KindDot } from './timeline_summary';

const MAX_FACTS = 4;
const MAX_EVENTS = 6;

/**
 * A simplified view of an entity, on hover so it need not be opened: what it is, its key facts and
 * how many events happened to it. The full view is in the entity's flyout, which a click opens.
 */
export const EntityHoverCard: React.FC<{
  entityId: string;
  impactMap: InvestigationImpactMapResponse;
  /** When given, the entity's events are listed, and a click on one opens it. */
  onOpenEvent?: (eventId: string) => void;
}> = ({ entityId, impactMap, onOpenEvent }) => {
  const { euiTheme } = useEuiTheme();
  const entity = impactMap.entities.find(({ id }) => id === entityId);
  const type = entity ? impactMap.entity_types.find(({ id }) => id === entity.type_id) : undefined;
  const name = entity?.label ?? entityId;
  const typeLabel = entity ? getEntityTypeLabel(type, name) : undefined;
  // The facts the agent marked as key come first; with none marked, the first few there are.
  const rows = resolveEntityMetadata(entity, type);
  const facts = rows.slice(0, MAX_FACTS);
  const entityEvents = impactMap.events
    .filter((event) => getEventEntityIds(event, impactMap.relationships).includes(entityId))
    .sort(compareEventsByTime);
  const eventCount = entityEvents.length;

  return (
    <div data-test-subj="agenticInvestigationsEntityHoverCard">
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type={getEntityIcon(type)} size="l" aria-hidden />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s">
            <strong>{name}</strong>
          </EuiText>
          {typeLabel && (
            <EuiText size="xs" color="subdued">
              {typeLabel}
            </EuiText>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
      {facts.length > 0 && (
        <div css={{ marginTop: euiTheme.size.m }}>
          {facts.map(({ key, label, value }) => (
            <EuiFlexGroup
              key={key}
              gutterSize="s"
              responsive={false}
              css={{ marginTop: euiTheme.size.xs }}
            >
              <EuiFlexItem grow={false} css={{ minInlineSize: 110 }}>
                <EuiText size="xs" color="subdued">
                  {label}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem css={{ minInlineSize: 0 }}>
                <EuiText size="xs" css={{ overflowWrap: 'anywhere' }}>
                  {value}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          ))}
        </div>
      )}
      {onOpenEvent && eventCount > 0 ? (
        // The events, each one to open, as the entity's own flyout lists them.
        <div
          css={{ marginTop: euiTheme.size.m }}
          data-test-subj="agenticInvestigationsEntityHoverEvents"
        >
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.agenticInvestigations.entityHoverCard.eventsList', {
              defaultMessage: '{count, plural, one {# event} other {# events}}',
              values: { count: eventCount },
            })}
          </EuiText>
          {entityEvents.slice(0, MAX_EVENTS).map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={() => onOpenEvent(event.id)}
              data-test-subj={`agenticInvestigationsEntityHoverEvent-${event.id}`}
              css={css`
                display: flex;
                gap: ${euiTheme.size.s};
                align-items: flex-start;
                inline-size: 100%;
                margin-block-start: ${euiTheme.size.xs};
                padding: ${euiTheme.size.xs};
                border: none;
                border-radius: ${euiTheme.border.radius.medium};
                background: none;
                color: inherit;
                font: inherit;
                text-align: start;
                cursor: pointer;
                &:hover,
                &:focus-visible {
                  background: ${euiTheme.colors.backgroundBaseInteractiveHover};
                }
              `}
            >
              {/* A box of its own size that does not shrink, so every kind's icon is the same size and the text lines up. */}
              <span
                css={css`
                  display: inline-flex;
                  flex: 0 0 24px;
                  align-items: center;
                  justify-content: center;
                  inline-size: 24px;
                  block-size: 24px;
                `}
              >
                <KindDot kind={event.kind} size="s" quiet />
              </span>
              <span css={{ minInlineSize: 0 }}>
                <EuiText size="xs" color="subdued">
                  {formatTimelineClock(event.at)}
                </EuiText>
                <EuiText
                  size="xs"
                  css={css`
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                  `}
                >
                  {event.title}
                </EuiText>
              </span>
            </button>
          ))}
          {eventCount > MAX_EVENTS && (
            <EuiText size="xs" color="subdued" css={{ marginBlockStart: euiTheme.size.xs }}>
              {i18n.translate('xpack.agenticInvestigations.entityHoverCard.moreEvents', {
                defaultMessage: '+{count} more: click the entity for all of them',
                values: { count: eventCount - MAX_EVENTS },
              })}
            </EuiText>
          )}
        </div>
      ) : (
        <EuiText size="xs" color="subdued" css={{ marginTop: euiTheme.size.m }}>
          {i18n.translate('xpack.agenticInvestigations.entityHoverCard.events', {
            defaultMessage:
              '{count, plural, =0 {No events} one {# event} other {# events}} on the timeline. Click for more.',
            values: { count: eventCount },
          })}
        </EuiText>
      )}
    </div>
  );
};
