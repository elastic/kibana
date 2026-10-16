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
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { ConversationMetaInfo } from '@kbn/agentic-investigations-common';
import { useAiButtonGradientStyles } from '@kbn/shared-ux-ai-components';
import type { InvestigationSummary } from '../../../../common';
import { InvestigatingTypingDots } from './investigating_typing_dots';
import { getInvestigationDisplayTitle } from './to_view_model';
import { IN_PROGRESS_LABEL, moreEntitiesLabel } from './translations';

const MAX_VISIBLE_ENTITIES = 3;

export interface InvestigationCardProps {
  investigation: InvestigationSummary;
  /** Makes the main card content a button; for example to open the conversation details flyout. */
  onClick?: (investigation: InvestigationSummary) => void;
  isSelected?: boolean;
  /**
   * Trailing controls on the age row (open in chat, overflow menu, …). Rendered as a sibling of
   * the card button so actions are not nested interactive controls.
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
  const { labelCss: aiLabelCss } = useAiButtonGradientStyles({ variant: 'outlined' });
  // Same primary→assistance stop colors the AI label gradient uses (dots can't use background-clip).
  const aiDotsFill = `linear-gradient(135deg, ${euiTheme.colors.textPrimary} 2.98%, ${euiTheme.colors.textAssistance} 66.24%)`;
  const { metadata, in_progress: inProgress, created_at: createdAt } = investigation;
  const title = getInvestigationDisplayTitle(investigation);
  const { summary } = metadata;
  const hasEntities = (investigation.impact?.entities?.length ?? 0) > 0;
  const isInteractive = onClick != null;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick?.(investigation);
    }
  };

  const inProgressStatus = inProgress ? (
    <span
      data-test-subj="investigationCardRunning"
      css={css`
        display: inline-flex;
        align-items: center;
        gap: ${euiTheme.size.xs};
      `}
    >
      <EuiText
        size="xs"
        component="span"
        css={[
          aiLabelCss,
          css`
            padding: 0;
            line-height: 1;
          `,
        ]}
      >
        {IN_PROGRESS_LABEL}
      </EuiText>
      <InvestigatingTypingDots color={aiDotsFill} />
    </span>
  ) : undefined;

  const cardBody = (
    <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
      <EuiFlexItem grow={false}>
        <ConversationMetaInfo timestamp={createdAt} inFlightStatus={inProgressStatus} />
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
  );

  return (
    <div
      data-test-subj="investigationCard"
      css={css`
        /* Top matches the right (16px); bottom/left stay 24px so content aligns with ConversationCard. */
        padding: ${euiTheme.size.base} ${euiTheme.size.base} ${euiTheme.size.l} ${euiTheme.size.l};
        background: ${isSelected
          ? euiTheme.colors.backgroundBaseInteractiveSelect
          : euiTheme.colors.backgroundBasePlain};
        ${isInteractive && !isSelected
          ? `&:has([data-test-subj='investigationCardButton']:hover) {
              background: ${euiTheme.colors.backgroundBaseSubdued};
            }`
          : ''}
      `}
    >
      <div
        css={css`
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          column-gap: ${euiTheme.size.s};
          align-items: start;
        `}
      >
        <div
          role={isInteractive ? 'button' : undefined}
          tabIndex={isInteractive ? 0 : undefined}
          aria-label={isInteractive ? title : undefined}
          aria-pressed={isInteractive ? isSelected : undefined}
          data-test-subj={isInteractive ? 'investigationCardButton' : undefined}
          onClick={isInteractive ? () => onClick(investigation) : undefined}
          onKeyDown={isInteractive ? handleKeyDown : undefined}
          css={css`
            grid-column: 1;
            grid-row: 1 / -1;
            min-width: 0;
            ${isInteractive ? 'cursor: pointer;' : ''}
          `}
        >
          {cardBody}
        </div>
        {actions != null && (
          <div
            css={css`
              grid-column: 2;
              grid-row: 1;
            `}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
