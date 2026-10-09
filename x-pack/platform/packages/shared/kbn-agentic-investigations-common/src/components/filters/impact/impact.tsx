/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTextTruncate,
  EuiTitle,
  useEuiTheme,
  useResizeObserver,
} from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import type { ImpactFilterable } from './entity_ids';
import { impactPills } from './impact_pills';
import type { ImpactPill } from './impact_pills';
import { IMPACT_LABELS } from './translations';
import { findVisiblePills, isVisibleIndex } from './visible_pills';
import type { PillMeasurements, VisiblePills } from './visible_pills';

export const IMPACT_PILLS_TEST_SUBJ = 'alertzeroImpactPills';
export const IMPACT_PILL_TEST_SUBJ = 'alertzeroImpactPill';
export const IMPACT_OVERFLOW_TEST_SUBJ = 'alertzeroImpactOverflow';
export const IMPACT_COLLAPSE_TEST_SUBJ = 'alertzeroImpactCollapse';

interface ImpactProps {
  items: readonly ImpactFilterable[];
  entityFilter: string | null;
  onEntityFilterChange: (entityId: string | null) => void;
}

interface PillBadgeProps {
  label?: string;
  count?: number;
  selected?: boolean;
  iconType?: IconType;
  ariaLabel: string;
  /** Omitted for the hidden measuring copy, which must not be interactive. */
  onClick?: () => void;
}

const PillBadge: React.FC<PillBadgeProps> = ({
  label,
  count,
  selected = false,
  iconType,
  ariaLabel,
  onClick,
}) => {
  const { euiTheme } = useEuiTheme();

  const interactiveProps = onClick ? { onClick, onClickAriaLabel: ariaLabel } : {};
  const isIconOnly = label === undefined && iconType !== undefined;
  // Icon-only pills get the same horizontal footprint as a short text pill.
  const padding = isIconOnly ? `${euiTheme.size.xs} ${euiTheme.size.m}` : euiTheme.size.xs;

  return (
    <EuiBadge
      {...interactiveProps}
      iconType={iconType}
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
          <EuiFlexItem grow={false}>
            <EuiText size="xs" style={{ padding: `0 ${euiTheme.size.xs}` }}>
              <EuiTextTruncate text={label} width={120} truncation="end" />
            </EuiText>
          </EuiFlexItem>
          {count !== undefined && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">{count}</EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      )}
    </EuiBadge>
  );
};

export const Impact: React.FC<ImpactProps> = ({ items, entityFilter, onEntityFilterChange }) => {
  const { euiTheme } = useEuiTheme();
  const [rowElement, setRowElement] = useState<HTMLDivElement | null>(null);
  const { width: observedWidth } = useResizeObserver(rowElement, 'width');
  // Refs into the hidden measuring copy; the visible row is never inspected.
  const pillRefs = useRef<Array<HTMLDivElement | null>>([]);
  const overflowRef = useRef<HTMLDivElement>(null);
  const [measurements, setMeasurements] = useState<PillMeasurements | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const pills = useMemo(() => impactPills(items), [items]);
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
  // filter never re-measures. Tracked even while expanded so the collapse
  // control disappears once everything fits again. Until the first
  // measurement every pill is shown.
  const collapsed: VisiblePills =
    measurements && measurements.pillWidths.length === pills.length
      ? findVisiblePills(measurements, pills, entityFilter)
      : { prefixCount: pills.length, pinnedIndex: null };

  // Items stretch to the row height and center their pill, so the shorter +n
  // pill lines up with the count pills beside it.
  const pillItemStyles = css({ justifyContent: 'center' });

  const collapsedPills = pills.filter((_, index) => isVisibleIndex(index, collapsed));
  const overflowCount = Math.max(0, pills.length - collapsedPills.length);
  const showAll = isExpanded && overflowCount > 0;
  const visiblePills = showAll ? pills : collapsedPills;

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
        label={pill.entityId}
        count={pill.count}
        selected={entityFilter === pill.entityId}
        ariaLabel={pill.entityId}
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
          {showAll ? (
            <EuiFlexItem
              grow={false}
              css={pillItemStyles}
              data-test-subj={IMPACT_COLLAPSE_TEST_SUBJ}
            >
              <PillBadge
                iconType="sortLeft"
                ariaLabel={IMPACT_LABELS.showFewer}
                onClick={() => setIsExpanded(false)}
              />
            </EuiFlexItem>
          ) : overflowCount > 0 ? (
            <EuiFlexItem
              grow={false}
              css={pillItemStyles}
              data-test-subj={IMPACT_OVERFLOW_TEST_SUBJ}
            >
              <PillBadge
                label={IMPACT_LABELS.showMore(overflowCount)}
                ariaLabel={IMPACT_LABELS.showMoreAriaLabel(overflowCount)}
                onClick={() => setIsExpanded(true)}
              />
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </div>
    </>
  );
};
