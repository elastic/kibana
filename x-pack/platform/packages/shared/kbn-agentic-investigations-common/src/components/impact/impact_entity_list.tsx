/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import { css } from '@emotion/react';
import type { IconType } from '@elastic/eui';
import {
  EuiAvatar,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  useEuiFontSize,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import {
  ATTACHMENT_SUMMARY_SHOW_LESS,
  attachmentSummaryShowMore,
} from '../attachment_summary/translations';
import { DEFAULT_COLLAPSED_COUNT } from '../attachment_summary/attachment_summary_list';
import {
  isImpactEntityLink,
  type ImpactEntityView,
  type OpenImpactEntity,
} from './impact_entities';
import { IMPACT_LABELS } from './translations';

const impactEntityIcon = (type: string | undefined): IconType => {
  switch (type?.toLowerCase()) {
    case 'host':
      return 'storage';
    case 'user':
      return 'user';
    case 'service':
      return 'node';
    default:
      return 'aggregate';
  }
};

export interface ImpactEntityListProps {
  entities: ImpactEntityView[];
  onOpenImpactEntity?: OpenImpactEntity;
  collapsedCount?: number;
}

/**
 * One row per Impact entity. Entity-store rows open a child flyout through `onOpenImpactEntity`.
 * Knowledge-indicator rows stay plain text: that destination is not a Flyout V2 child.
 */
export const ImpactEntityList = memo<ImpactEntityListProps>(
  ({ entities, onOpenImpactEntity, collapsedCount = DEFAULT_COLLAPSED_COUNT }) => {
    const { euiTheme } = useEuiTheme();
    const listId = useGeneratedHtmlId({ prefix: 'investigationImpactList' });
    const [isExpanded, setIsExpanded] = useState(false);

    if (entities.length === 0) {
      return null;
    }

    const hiddenCount = entities.length - collapsedCount;
    const isCollapsible = hiddenCount > 0;
    const visibleEntities =
      isCollapsible && !isExpanded ? entities.slice(0, collapsedCount) : entities;

    return (
      <EuiPanel
        hasBorder
        hasShadow={false}
        paddingSize="none"
        css={css({ borderRadius: euiTheme.size.s })}
        data-test-subj="investigationImpactPanel"
      >
        <EuiFlexGroup
          component="ul"
          id={listId}
          direction="column"
          gutterSize="none"
          responsive={false}
          css={css({ margin: 0, padding: 0, listStyle: 'none' })}
        >
          {visibleEntities.map((entity, index) => (
            <ImpactEntityRow
              key={entity.id}
              entity={entity}
              hasTopBorder={index > 0}
              onOpenImpactEntity={
                isImpactEntityLink(entity, onOpenImpactEntity) ? onOpenImpactEntity : undefined
              }
            />
          ))}
        </EuiFlexGroup>

        {isCollapsible && (
          <div
            css={css({
              padding: `${euiTheme.size.xs} ${euiTheme.size.s}`,
              borderTop: euiTheme.border.thin,
            })}
          >
            <EuiButtonEmpty
              size="xs"
              flush="left"
              aria-expanded={isExpanded}
              aria-controls={listId}
              onClick={() => setIsExpanded((expanded) => !expanded)}
              data-test-subj="investigationImpactToggle"
            >
              {isExpanded ? ATTACHMENT_SUMMARY_SHOW_LESS : attachmentSummaryShowMore(hiddenCount)}
            </EuiButtonEmpty>
          </div>
        )}
      </EuiPanel>
    );
  }
);

ImpactEntityList.displayName = 'ImpactEntityList';

const ImpactEntityRow = memo<{
  entity: ImpactEntityView;
  hasTopBorder: boolean;
  onOpenImpactEntity?: OpenImpactEntity;
}>(({ entity, hasTopBorder, onOpenImpactEntity }) => {
  const { euiTheme } = useEuiTheme();
  const { fontSize } = useEuiFontSize('s');
  const label = entity.name ?? entity.id;
  const interactive = onOpenImpactEntity !== undefined;

  const body = (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <span aria-hidden="true">
          <EuiAvatar
            name={entity.type ?? IMPACT_LABELS.groupTitle}
            iconType={impactEntityIcon(entity.type)}
            iconSize="s"
            size="s"
            color={euiTheme.colors.backgroundBasePrimary}
            iconColor={euiTheme.colors.textPrimary}
          />
        </span>
      </EuiFlexItem>
      <EuiFlexItem css={css({ minInlineSize: 0 })}>
        <EuiText size="s" css={css({ fontSize, fontWeight: euiTheme.font.weight.semiBold })}>
          <span data-test-subj="investigationImpactRowLabel">{label}</span>
        </EuiText>
      </EuiFlexItem>
      {entity.type && (
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued" data-test-subj="investigationImpactRowType">
            {entity.type}
          </EuiText>
        </EuiFlexItem>
      )}
      {interactive && (
        <EuiFlexItem grow={false}>
          <EuiIcon type="chevronSingleRight" color="subdued" size="s" aria-hidden={true} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );

  const rowStyles = css({
    padding: `${euiTheme.size.s} ${euiTheme.size.base}`,
    borderTop: hasTopBorder ? euiTheme.border.thin : undefined,
  });

  return (
    <EuiFlexItem component="li" grow={false} data-test-subj="investigationImpactRow">
      {interactive ? (
        <button
          type="button"
          onClick={() => onOpenImpactEntity(entity)}
          aria-label={IMPACT_LABELS.openEntity({ label, type: entity.type })}
          data-test-subj="investigationImpactRowButton"
          css={css(
            {
              display: 'block',
              width: '100%',
              margin: 0,
              border: 'none',
              background: 'transparent',
              color: 'inherit',
              textAlign: 'start',
              cursor: 'pointer',
              '&:hover, &:focus-visible': {
                backgroundColor: euiTheme.colors.backgroundBaseSubdued,
              },
            },
            rowStyles
          )}
        >
          {body}
        </button>
      ) : (
        <div css={rowStyles}>{body}</div>
      )}
    </EuiFlexItem>
  );
});

ImpactEntityRow.displayName = 'ImpactEntityRow';
