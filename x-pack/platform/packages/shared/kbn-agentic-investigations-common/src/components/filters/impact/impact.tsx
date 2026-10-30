/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import { entityPillAriaLabel, entityPillLabel } from './entity_pill_label';
import { entityTypeIcon } from './entity_type_icon';
import type { ImpactPill, PagedImpactPills } from './impact_pills';
import { IMPACT_LABELS } from './translations';

export const IMPACT_PILLS_TEST_SUBJ = 'alertzeroImpactPills';
export const IMPACT_PILL_TEST_SUBJ = 'alertzeroImpactPill';
export const IMPACT_OVERFLOW_TEST_SUBJ = 'alertzeroImpactOverflow';
export const IMPACT_COLLAPSE_TEST_SUBJ = 'alertzeroImpactCollapse';

/** At this many per row, the first page (10 pills and the `+n` pill) always fits two rows. */
const PILLS_PER_ROW = 6;
const MAX_LABEL_WIDTH = 120;

interface ImpactProps {
  impact: PagedImpactPills;
  entityFilter: string | null;
  selectedPill: ImpactPill | null;
  onEntityFilterChange: (entityId: string | null) => void;
}

interface PillBadgeProps {
  label?: string;
  count?: number;
  selected?: boolean;
  iconType?: IconType;
  ariaLabel: string;
  /** Full name, and the id when they differ, shown on hover. */
  tooltip?: string;
  /** Lets keyboard users reach a pill that is not a button, so its tooltip shows. */
  focusable?: boolean;
  onClick?: () => void;
}

const PillBadge: React.FC<PillBadgeProps> = ({
  label,
  count,
  selected = false,
  iconType,
  ariaLabel,
  tooltip,
  focusable = false,
  onClick,
}) => {
  const { euiTheme } = useEuiTheme();

  const interactiveProps = onClick
    ? { onClick, onClickAriaLabel: ariaLabel }
    : focusable
    ? { role: 'note', tabIndex: 0, 'aria-label': ariaLabel }
    : {};
  const isIconOnly = label === undefined && iconType !== undefined;
  // Icon-only pills get the same horizontal footprint as a short text pill.
  const padding = isIconOnly ? `${euiTheme.size.xs} ${euiTheme.size.m}` : euiTheme.size.xs;

  const badge = (
    <EuiBadge
      {...interactiveProps}
      // A labelled pill draws its own 16px icon below; EuiBadge would render it at 12px.
      iconType={isIconOnly ? iconType : undefined}
      style={{ padding, maxWidth: '100%', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      css={css({
        background: selected
          ? euiTheme.colors.backgroundBaseHighlighted
          : euiTheme.colors.emptyShade,
        border: `1px solid ${selected ? euiTheme.colors.darkShade : euiTheme.colors.lightShade}`,
        '&:hover': {
          border: `1px solid ${
            selected ? euiTheme.colors.darkShade : euiTheme.colors.borderInteractiveFormsHoverPlain
          }`,
        },
      })}
    >
      {label !== undefined && (
        <EuiFlexGroup
          gutterSize="none"
          alignItems="center"
          responsive={false}
          direction="row"
          css={css({ minWidth: 0 })}
        >
          {iconType !== undefined && (
            <EuiFlexItem
              grow={false}
              css={css({ padding: `0 ${euiTheme.size.xs}`, flexShrink: 0 })}
            >
              <EuiIcon type={iconType} size="m" color="subdued" aria-hidden="true" />
            </EuiFlexItem>
          )}
          <EuiFlexItem
            grow={false}
            css={css({ minWidth: 0, maxWidth: MAX_LABEL_WIDTH, flexShrink: 1 })}
          >
            <EuiText size="xs" css={css({ minWidth: 0, padding: `0 ${euiTheme.size.xs}` })}>
              <span
                css={css({
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                })}
              >
                {label}
              </span>
            </EuiText>
          </EuiFlexItem>
          {count !== undefined && (
            <EuiFlexItem grow={false} css={css({ paddingLeft: euiTheme.size.xs, flexShrink: 0 })}>
              <EuiBadge color="hollow">{count}</EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      )}
    </EuiBadge>
  );

  return tooltip ? <EuiToolTip content={tooltip}>{badge}</EuiToolTip> : badge;
};

export const Impact: React.FC<ImpactProps> = ({
  impact: {
    pills,
    remaining,
    canShowMore,
    reachLimit,
    loadFailed,
    isLoadingMore,
    showMore,
    showFewer,
  },
  entityFilter,
  selectedPill,
  onEntityFilterChange,
}) => {
  const { euiTheme } = useEuiTheme();

  const pinnedPill =
    selectedPill && !pills.some(({ entityId }) => entityId === selectedPill.entityId)
      ? selectedPill
      : null;

  if (pills.length === 0 && !pinnedPill) {
    return null;
  }

  // Items stretch to the row height and center their pill, so the shorter +n
  // pill lines up with the count pills beside it.
  const pillItemStyles = css({ justifyContent: 'center' });
  const gap = euiTheme.size.s;
  const pillItemMaxWidthStyles = css({
    minWidth: 0,
    maxWidth: `calc((100% - ${PILLS_PER_ROW - 1} * ${gap}) / ${PILLS_PER_ROW})`,
  });

  const renderPill = (pill: ImpactPill) => (
    <EuiFlexItem
      key={pill.entityId}
      grow={false}
      css={[pillItemStyles, pillItemMaxWidthStyles]}
      data-test-subj={IMPACT_PILL_TEST_SUBJ}
    >
      <PillBadge
        label={entityPillLabel(pill)}
        iconType={entityTypeIcon(pill.entityType)}
        count={pill.count}
        selected={entityFilter === pill.entityId}
        ariaLabel={entityPillAriaLabel(pill)}
        tooltip={entityPillAriaLabel(pill)}
        onClick={() => onEntityFilterChange(entityFilter === pill.entityId ? null : pill.entityId)}
      />
    </EuiFlexItem>
  );

  return (
    <>
      <EuiTitle size="xxs" css={css({ fontWeight: euiTheme.font.weight.semiBold })}>
        <h3>{IMPACT_LABELS.title}</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFlexGroup
        gutterSize="s"
        wrap
        responsive={false}
        aria-label={IMPACT_LABELS.title}
        data-test-subj={IMPACT_PILLS_TEST_SUBJ}
      >
        {pills.map(renderPill)}
        {pinnedPill && renderPill(pinnedPill)}
        {remaining > 0 && !loadFailed && (
          <EuiFlexItem grow={false} css={pillItemStyles} data-test-subj={IMPACT_OVERFLOW_TEST_SUBJ}>
            {canShowMore ? (
              <PillBadge
                label={IMPACT_LABELS.showMore(remaining)}
                ariaLabel={IMPACT_LABELS.showMoreAriaLabel(remaining)}
                onClick={isLoadingMore ? undefined : showMore}
              />
            ) : (
              <PillBadge
                label={IMPACT_LABELS.showMore(remaining)}
                ariaLabel={IMPACT_LABELS.reachLimit(reachLimit, remaining)}
                tooltip={IMPACT_LABELS.reachLimit(reachLimit, remaining)}
                focusable
              />
            )}
          </EuiFlexItem>
        )}
        {showFewer && (
          <EuiFlexItem grow={false} css={pillItemStyles} data-test-subj={IMPACT_COLLAPSE_TEST_SUBJ}>
            <PillBadge
              iconType="sortLeft"
              ariaLabel={IMPACT_LABELS.showFewer}
              onClick={showFewer}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </>
  );
};
