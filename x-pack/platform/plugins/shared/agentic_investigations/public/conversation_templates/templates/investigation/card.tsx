/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconTip,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { ConversationMetaInfo } from '@kbn/agentic-investigations-common';
import type { InvestigationSummary } from '../../../../common';
import { getInvestigationDisplayTitle } from './to_view_model';
import { moreEntitiesLabel, RUNNING_LABEL } from './translations';

const MAX_VISIBLE_ENTITIES = 3;

export interface InvestigationCardProps {
  investigation: InvestigationSummary;
  /** Makes the card a button; for example to open the conversation details flyout. */
  onClick?: (investigation: InvestigationSummary) => void;
  isSelected?: boolean;
  /**
   * Trailing controls on the age row (open in chat, overflow menu, …). The host owns the actions
   * and must stop click propagation so they do not open the card.
   */
  actions?: React.ReactNode;
}

const EntityChips = ({ investigation }: { investigation: InvestigationSummary }) => {
  const entities = investigation.impact?.entities ?? [];
  if (entities.length === 0) {
    return null;
  }
  const visible = entities.slice(0, MAX_VISIBLE_ENTITIES);
  const overflow = entities.length - visible.length;
  return (
    <>
      {visible.map((entity) => (
        <EuiFlexItem key={entity.id} grow={false} css={{ display: 'flex', alignItems: 'center' }}>
          <EuiBadge
            color="hollow"
            iconType={() => <EuiIcon type="dot" color="danger" size="s" aria-hidden />}
            data-test-subj="investigationCardEntity"
          >
            {entity.name ?? entity.id}
          </EuiBadge>
        </EuiFlexItem>
      ))}
      {overflow > 0 && (
        <EuiFlexItem grow={false} css={{ display: 'flex', alignItems: 'center' }}>
          <EuiBadge color="hollow" data-test-subj="investigationCardEntityOverflow">
            {moreEntitiesLabel(overflow)}
          </EuiBadge>
        </EuiFlexItem>
      )}
    </>
  );
};

/**
 * A compact investigation card: age on top (with running indicator and optional trailing actions),
 * title, a two-line summary, and impacted entities. Presentational; the host supplies the
 * investigation and decides what a click does.
 */
export const InvestigationCard: React.FC<InvestigationCardProps> = ({
  investigation,
  onClick,
  isSelected = false,
  actions,
}) => {
  const { euiTheme } = useEuiTheme();
  const { metadata, in_progress: inProgress, created_at: createdAt } = investigation;
  const title = getInvestigationDisplayTitle(investigation);
  const { summary } = metadata;
  const hasEntities = (investigation.impact?.entities?.length ?? 0) > 0;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick?.(investigation);
    }
  };

  return (
    <div
      data-test-subj="investigationCard"
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-pressed={onClick ? isSelected : undefined}
      onClick={onClick ? () => onClick(investigation) : undefined}
      onKeyDown={onClick ? handleKeyDown : undefined}
      css={css`
        /* Top matches the right (16px); bottom/left stay 24px so content aligns with ConversationCard. */
        padding: ${euiTheme.size.base} ${euiTheme.size.base} ${euiTheme.size.l} ${euiTheme.size.l};
        background: ${isSelected
          ? euiTheme.colors.backgroundBaseInteractiveSelect
          : euiTheme.colors.backgroundBasePlain};
        ${onClick ? 'cursor: pointer;' : ''}
        ${onClick && !isSelected
          ? `&:hover { background: ${euiTheme.colors.backgroundBaseSubdued}; }`
          : ''}
      `}
    >
      <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup
            alignItems="center"
            gutterSize="s"
            responsive={false}
            justifyContent="spaceBetween"
          >
            <EuiFlexItem grow={false}>
              <ConversationMetaInfo
                createdAt={createdAt}
                inFlightStatus={
                  inProgress ? (
                    <EuiIconTip
                      type="dot"
                      color="primary"
                      content={RUNNING_LABEL}
                      aria-label={RUNNING_LABEL}
                      iconProps={{ 'data-test-subj': 'investigationCardRunning' }}
                    />
                  ) : undefined
                }
              />
            </EuiFlexItem>
            {actions != null && (
              <EuiFlexItem
                grow={false}
                onClick={(event: React.MouseEvent) => event.stopPropagation()}
                onKeyDown={(event: React.KeyboardEvent) => event.stopPropagation()}
              >
                {actions}
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false} css={{ minWidth: 0, paddingBlockStart: euiTheme.size.xs }}>
          <EuiText size="s">
            <p
              className="eui-textTruncate"
              title={title}
              css={css`
                margin: 0;
                font-weight: ${euiTheme.font.weight.semiBold};
              `}
              data-test-subj="investigationCardTitle"
            >
              {title}
            </p>
          </EuiText>
        </EuiFlexItem>

        {summary && (
          <EuiFlexItem grow={false} css={{ paddingBlockStart: euiTheme.size.xs }}>
            <EuiText size="xs" color="subdued">
              <p
                data-test-subj="investigationCardSummary"
                css={css`
                  margin: 0;
                  display: -webkit-box;
                  -webkit-line-clamp: 2;
                  -webkit-box-orient: vertical;
                  overflow: hidden;
                `}
              >
                {summary}
              </p>
            </EuiText>
          </EuiFlexItem>
        )}

        {hasEntities && (
          <EuiFlexItem
            grow={false}
            css={{
              // 8px under the summary; 4px when the badges follow the title directly.
              paddingBlockStart: summary ? euiTheme.size.s : euiTheme.size.xs,
            }}
          >
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
              <EntityChips investigation={investigation} />
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </div>
  );
};
