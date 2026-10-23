/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { ConversationMetaInfo, toPlainSummary } from '@kbn/agentic-investigations-common';
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

  // Card-local middot/status. Negative start margin cancels Meta's gutterSize="s" down to xs.
  const inProgressStatus = inProgress ? (
    <span
      data-test-subj="investigationCardRunning"
      css={css`
        display: inline-flex;
        align-items: center;
        gap: ${euiTheme.size.xs};
        margin-inline-start: calc(${euiTheme.size.xs} - ${euiTheme.size.s});
      `}
    >
      <EuiText size="xs" color="subdued" component="span" aria-hidden>
        •
      </EuiText>
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

  const hasActions = actions != null;

  // Spacer matching ConversationsActionsGroup / Nightshift card actions: divider margins +
  // two size="s" (32px) icon buttons + gutters — keeps age text from running under the icons.
  const actionsSpacerWidth = `calc(${euiTheme.size.xl} * 2 + ${euiTheme.size.l} + ${euiTheme.size.s})`;

  return (
    <div
      data-test-subj="investigationCard"
      css={css`
        position: relative;
        /* Same as ConversationCard: 24px on three sides; 16px on the right so 32px icon
           buttons' glyphs land at 24px from the edge. */
        padding: ${euiTheme.size.l} ${euiTheme.size.base} ${euiTheme.size.l} ${euiTheme.size.l};
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
      {/*
        ConversationCard layout: age | actions share the top row (actions overhang by 8px so the
        age stays on the padding line); title/summary use the full width below. Actions stay a
        sibling of the card button so interactive controls are not nested.
      */}
      <div
        role={isInteractive ? 'button' : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        aria-label={isInteractive ? title : undefined}
        aria-pressed={isInteractive ? isSelected : undefined}
        data-test-subj={isInteractive ? 'investigationCardButton' : undefined}
        onClick={isInteractive ? () => onClick(investigation) : undefined}
        onKeyDown={isInteractive ? handleKeyDown : undefined}
        css={css`
          ${isInteractive ? 'cursor: pointer;' : ''}
        `}
      >
        <EuiFlexGroup gutterSize="xs" responsive={false} direction="column">
          <EuiFlexItem
            grow={false}
            // Actions overhang by 8px; give that back under the row so age-to-title stays put.
            css={hasActions ? { paddingBlockEnd: euiTheme.size.s } : undefined}
          >
            <EuiFlexGroup
              alignItems="center"
              gutterSize="l"
              responsive={false}
              justifyContent="spaceBetween"
              direction="row"
            >
              <EuiFlexItem grow={false} css={{ minWidth: 0 }}>
                <ConversationMetaInfo timestamp={createdAt} inFlightStatus={inProgressStatus} />
              </EuiFlexItem>
              {hasActions && (
                <EuiFlexItem
                  grow={false}
                  aria-hidden
                  css={{
                    marginBlock: `-${euiTheme.size.s}`,
                    inlineSize: actionsSpacerWidth,
                    blockSize: euiTheme.size.xl,
                    flexShrink: 0,
                  }}
                />
              )}
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem grow={false} css={{ minWidth: 0 }}>
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
            <EuiFlexItem grow={false}>
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
                  {toPlainSummary(summary)}
                </p>
              </EuiText>
            </EuiFlexItem>
          )}

          {hasEntities && (
            <EuiFlexItem
              grow={false}
              // Column gutter is xs; add xs more under a summary so badges stay at s (8px).
              css={summary ? { marginBlockStart: euiTheme.size.xs } : undefined}
            >
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
                <EntityChips investigation={investigation} />
              </EuiFlexGroup>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </div>
      {hasActions && (
        <div
          css={css`
            position: absolute;
            inset-block-start: ${euiTheme.size.l};
            inset-inline-end: ${euiTheme.size.base};
            /* 32px icon buttons overhang so age text stays on the padding line. */
            margin-block: -${euiTheme.size.s};
          `}
        >
          {actions}
        </div>
      )}
    </div>
  );
};
