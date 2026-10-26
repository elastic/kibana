/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useLayoutEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTextTruncate,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useResizeObserver,
} from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import { entityPillAriaLabel, entityPillLabel } from './entity_pill_label';
import { entityTypeIcon } from './entity_type_icon';
import type { ImpactPill } from './impact_pills';
import { IMPACT_LABELS } from './translations';
import { findVisiblePills, isVisibleIndex, rowsAfterExpansions } from './visible_pills';
import type { PillMeasurements, VisiblePills } from './visible_pills';

export const IMPACT_PILLS_TEST_SUBJ = 'alertzeroImpactPills';
export const IMPACT_PILL_TEST_SUBJ = 'alertzeroImpactPill';
export const IMPACT_OVERFLOW_TEST_SUBJ = 'alertzeroImpactOverflow';
export const IMPACT_COLLAPSE_TEST_SUBJ = 'alertzeroImpactCollapse';

interface ImpactProps {
  pills: readonly ImpactPill[];
  entityFilter: string | null;
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
  /** Omitted for the hidden measuring copy, which must not be interactive. */
  onClick?: () => void;
}

const PillBadge: React.FC<PillBadgeProps> = ({
  label,
  count,
  selected = false,
  iconType,
  ariaLabel,
  tooltip,
  onClick,
}) => {
  const { euiTheme } = useEuiTheme();

  const interactiveProps = onClick ? { onClick, onClickAriaLabel: ariaLabel } : {};
  const isIconOnly = label === undefined && iconType !== undefined;
  // Icon-only pills get the same horizontal footprint as a short text pill.
  const padding = isIconOnly ? `${euiTheme.size.xs} ${euiTheme.size.m}` : euiTheme.size.xs;

  const badge = (
    <EuiBadge
      {...interactiveProps}
      // A labelled pill draws its own 16px icon below; EuiBadge would render it at 12px.
      iconType={isIconOnly ? iconType : undefined}
      style={{ padding, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
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
        <EuiFlexGroup gutterSize="none" alignItems="center" responsive={false} direction="row">
          {iconType !== undefined && (
            <EuiFlexItem grow={false} css={css({ padding: `0 ${euiTheme.size.xs}` })}>
              <EuiIcon type={iconType} size="m" color="subdued" aria-hidden="true" />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiText size="xs" style={{ padding: `0 ${euiTheme.size.xs}` }}>
              <EuiTextTruncate text={label} width={120} truncation="end" />
            </EuiText>
          </EuiFlexItem>
          {count !== undefined && (
            <EuiFlexItem grow={false} css={css({ paddingLeft: euiTheme.size.xs })}>
              <EuiBadge color="hollow">{count}</EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      )}
    </EuiBadge>
  );

  return tooltip ? <EuiToolTip content={tooltip}>{badge}</EuiToolTip> : badge;
};

export const Impact: React.FC<ImpactProps> = ({ pills, entityFilter, onEntityFilterChange }) => {
  const { euiTheme } = useEuiTheme();
  const [rowElement, setRowElement] = useState<HTMLDivElement | null>(null);
  const { width: observedWidth } = useResizeObserver(rowElement, 'width');
  // Refs into the hidden measuring copy; the visible row is never inspected.
  const pillRefs = useRef<Array<HTMLDivElement | null>>([]);
  const overflowRef = useRef<HTMLDivElement>(null);
  const [measurements, setMeasurements] = useState<PillMeasurements | null>(null);
  // How many times `+n` was clicked; each click reveals `ROWS_PER_EXPAND` more rows.
  const [expansions, setExpansions] = useState(0);

  // `gutterSize="s"` on EuiFlexGroup renders `gap: euiTheme.size.s`.
  const gap = parseFloat(euiTheme.size.s);

  // Measure every pill's natural width once per resize or pill change. The
  // state update lands before paint, so the uncollapsed row never flashes.
  useLayoutEffect(() => {
    if (!rowElement || !overflowRef.current) {
      return;
    }
    setMeasurements({
      pillWidths: pills.map(
        (_, index) => pillRefs.current[index]?.getBoundingClientRect().width ?? 0
      ),
      overflowWidth: overflowRef.current.getBoundingClientRect().width,
      containerWidth: rowElement.getBoundingClientRect().width,
      gap,
    });
  }, [rowElement, observedWidth, pills, gap]);

  if (pills.length === 0) {
    return null;
  }

  // What the collapsed row would show, derived during render so changing the
  // filter never re-measures. Tracked even while expanded so the controls
  // disappear once everything fits again. Until the first measurement every
  // pill is shown.
  const isMeasured = measurements !== null && measurements.pillWidths.length === pills.length;
  const collapsed: VisiblePills = isMeasured
    ? findVisiblePills(measurements, pills, entityFilter)
    : { prefixCount: pills.length, pinnedIndex: null };
  const collapsedCount = pills.filter((_, index) => isVisibleIndex(index, collapsed)).length;
  const isExpanded = isMeasured && expansions > 0 && collapsedCount < pills.length;
  // Expanding reveals a few more rows at a time, keeping room for "show fewer" beside `+n`.
  const shown: VisiblePills = isExpanded
    ? findVisiblePills(measurements, pills, entityFilter, {
        maxRows: rowsAfterExpansions(expansions),
        collapseControl: true,
      })
    : collapsed;

  // Items stretch to the row height and center their pill, so the shorter +n
  // pill lines up with the count pills beside it.
  const pillItemStyles = css({ justifyContent: 'center' });

  const visiblePills = pills.filter((_, index) => isVisibleIndex(index, shown));
  const overflowCount = Math.max(0, pills.length - visiblePills.length);

  const renderPill = (
    pill: ImpactPill,
    interactive: boolean,
    ref?: (element: HTMLDivElement | null) => void
  ) => (
    <EuiFlexItem
      key={pill.entityId}
      ref={ref}
      grow={false}
      css={pillItemStyles}
      data-test-subj={IMPACT_PILL_TEST_SUBJ}
    >
      <PillBadge
        label={entityPillLabel(pill)}
        iconType={entityTypeIcon(pill.entityType)}
        count={pill.count}
        selected={entityFilter === pill.entityId}
        ariaLabel={entityPillAriaLabel(pill)}
        tooltip={entityPillAriaLabel(pill)}
        onClick={
          interactive
            ? () => onEntityFilterChange(entityFilter === pill.entityId ? null : pill.entityId)
            : undefined
        }
      />
    </EuiFlexItem>
  );

  return (
    <>
      <EuiTitle size="xxs" css={css({ fontWeight: euiTheme.font.weight.semiBold })}>
        <h3>{IMPACT_LABELS.title}</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <div ref={setRowElement} css={css({ position: 'relative', width: '100%' })}>
        {/* Hidden copy of every pill, measured to find how many fit in MAX_PILL_ROWS. */}
        <div
          aria-hidden
          css={css({
            position: 'absolute',
            visibility: 'hidden',
            pointerEvents: 'none',
            width: '100%',
            height: 0,
            overflow: 'hidden',
          })}
        >
          <EuiFlexGroup gutterSize="s" wrap responsive={false}>
            {pills.map((pill, index) =>
              renderPill(pill, false, (element) => {
                pillRefs.current[index] = element;
              })
            )}
            <EuiFlexItem
              ref={overflowRef}
              grow={false}
              css={pillItemStyles}
              data-test-subj={IMPACT_OVERFLOW_TEST_SUBJ}
            >
              <PillBadge
                label={IMPACT_LABELS.showMore(pills.length)}
                ariaLabel={IMPACT_LABELS.showMoreAriaLabel(pills.length)}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>

        <EuiFlexGroup
          gutterSize="s"
          wrap
          responsive={false}
          aria-label={IMPACT_LABELS.title}
          data-test-subj={IMPACT_PILLS_TEST_SUBJ}
        >
          {visiblePills.map((pill) => renderPill(pill, true))}
          {overflowCount > 0 && (
            <EuiFlexItem
              grow={false}
              css={pillItemStyles}
              data-test-subj={IMPACT_OVERFLOW_TEST_SUBJ}
            >
              <PillBadge
                label={IMPACT_LABELS.showMore(overflowCount)}
                ariaLabel={IMPACT_LABELS.showMoreAriaLabel(overflowCount)}
                onClick={() => setExpansions(expansions + 1)}
              />
            </EuiFlexItem>
          )}
          {isExpanded && (
            <EuiFlexItem
              grow={false}
              css={pillItemStyles}
              data-test-subj={IMPACT_COLLAPSE_TEST_SUBJ}
            >
              <PillBadge
                iconType="sortLeft"
                ariaLabel={IMPACT_LABELS.showFewer}
                onClick={() => setExpansions(0)}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </div>
    </>
  );
};
