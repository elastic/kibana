/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { InvestigationImpactMapResponse } from '../../common';
import { resolveEntityMetadata } from '../../common';
import {
  getEntityIcon,
  getEntityTypeLabel,
  getEventEntityIds,
} from '../conversation_templates/templates/investigation/flyout/impact_map_events';

const MAX_FACTS = 4;

/**
 * A simplified view of an entity, on hover so it need not be opened: what it is, its key facts and
 * how many events happened to it. The full view is in the entity's flyout, which a click opens.
 */
export const EntityHoverCard: React.FC<{
  entityId: string;
  impactMap: InvestigationImpactMapResponse;
}> = ({ entityId, impactMap }) => {
  const { euiTheme } = useEuiTheme();
  const entity = impactMap.entities.find(({ id }) => id === entityId);
  const type = entity ? impactMap.entity_types.find(({ id }) => id === entity.type_id) : undefined;
  const name = entity?.label ?? entityId;
  const typeLabel = entity ? getEntityTypeLabel(type, name) : undefined;
  // The facts the agent marked as key come first; with none marked, the first few there are.
  const rows = resolveEntityMetadata(entity, type);
  const facts = rows.slice(0, MAX_FACTS);
  const eventCount = impactMap.events.filter((event) =>
    getEventEntityIds(event, impactMap.relationships).includes(entityId)
  ).length;

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
      <EuiText size="xs" color="subdued" css={{ marginTop: euiTheme.size.m }}>
        {i18n.translate('xpack.agenticInvestigations.entityHoverCard.events', {
          defaultMessage:
            '{count, plural, =0 {No events} one {# event} other {# events}} on the timeline. Click for more.',
          values: { count: eventCount },
        })}
      </EuiText>
    </div>
  );
};
