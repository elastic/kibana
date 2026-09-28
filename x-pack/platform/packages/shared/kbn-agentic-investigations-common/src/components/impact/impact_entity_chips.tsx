/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import {
  isImpactEntityLink,
  type ImpactEntityView,
  type OpenImpactEntity,
} from './impact_entities';
import { IMPACT_LABELS } from './translations';

export interface ImpactEntityChipsProps {
  entities: ImpactEntityView[];
  onOpenImpactEntity?: OpenImpactEntity;
}

/**
 * Overview summary of Impact, matching Nightshift's impacted-entity chips.
 * Entity-store chips open a child flyout. Knowledge-indicator chips stay plain text.
 */
export const ImpactEntityChips = memo<ImpactEntityChipsProps>(
  ({ entities, onOpenImpactEntity }) => {
    if (entities.length === 0) {
      return null;
    }

    return (
      <EuiFlexGroup
        gutterSize="s"
        wrap
        responsive={false}
        data-test-subj="investigationImpactChips"
      >
        {entities.map((entity) => (
          <EuiFlexItem grow={false} key={entity.id}>
            <ImpactEntityChip
              entity={entity}
              onOpenImpactEntity={
                isImpactEntityLink(entity, onOpenImpactEntity) ? onOpenImpactEntity : undefined
              }
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    );
  }
);

ImpactEntityChips.displayName = 'ImpactEntityChips';

const ImpactEntityChip = memo<{
  entity: ImpactEntityView;
  onOpenImpactEntity?: OpenImpactEntity;
}>(({ entity, onOpenImpactEntity }) => {
  const { euiTheme } = useEuiTheme();
  const label = entity.name ?? entity.id;
  const interactive = onOpenImpactEntity !== undefined;

  const chipStyles = css({
    alignItems: 'center',
    background: euiTheme.colors.backgroundBasePlain,
    border: euiTheme.border.thin,
    borderRadius: euiTheme.size.base,
    boxSizing: 'border-box',
    color: euiTheme.colors.textParagraph,
    display: 'inline-flex',
    gap: euiTheme.size.xs,
    height: euiTheme.size.xl,
    margin: 0,
    padding: `0 ${euiTheme.size.m}`,
    ...(interactive
      ? {
          cursor: 'pointer',
          font: 'inherit',
          '&:hover, &:focus-visible': {
            background: euiTheme.colors.backgroundBaseSubdued,
          },
          '&:focus-visible': {
            outline: `${euiTheme.border.width.thick} solid ${euiTheme.colors.primary}`,
            outlineOffset: euiTheme.border.width.thin,
          },
        }
      : undefined),
  });

  const body = (
    <>
      <EuiText size="xs" component="span" data-test-subj="investigationImpactChipLabel">
        {label}
      </EuiText>
      {interactive && (
        <EuiIcon type="chevronSingleRight" size="s" color="subdued" aria-hidden={true} />
      )}
    </>
  );

  if (!interactive) {
    return (
      <span css={chipStyles} data-test-subj="investigationImpactChip">
        {body}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpenImpactEntity(entity)}
      aria-label={IMPACT_LABELS.openEntity({ label, type: entity.type })}
      data-test-subj="investigationImpactChip"
      css={chipStyles}
    >
      {body}
    </button>
  );
});

ImpactEntityChip.displayName = 'ImpactEntityChip';
