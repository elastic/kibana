/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
} from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import type { ImpactFilterable } from './entity_ids';
import { impactPills } from './impact_pills';
import type { ImpactPill } from './impact_pills';
import { IMPACT_LABELS } from './translations';

/** Collapsed Impact shows at most this many rows; the rest hides behind `+n`. */
const MAX_PILL_ROWS = 2;

export const IMPACT_PILLS_TEST_SUBJ = 'alertzeroImpactPills';
export const IMPACT_PILL_TEST_SUBJ = 'alertzeroImpactPill';
export const IMPACT_OVERFLOW_TEST_SUBJ = 'alertzeroImpactOverflow';
export const IMPACT_COLLAPSE_TEST_SUBJ = 'alertzeroImpactCollapse';

const MEASURE_ITEM_SELECTOR = `[data-test-subj="${IMPACT_PILL_TEST_SUBJ}"], [data-test-subj="${IMPACT_OVERFLOW_TEST_SUBJ}"]`;

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

/**
 * Which pills the collapsed row shows: the first `prefixCount` in order, plus
 * the selected pill appended at the end when it falls past that prefix.
 */
interface VisiblePills {
  prefixCount: number;
  pinnedIndex: number | null;
}

const isVisibleIndex = (index: number, { prefixCount, pinnedIndex }: VisiblePills): boolean =>
  index < prefixCount || index === pinnedIndex;

const setMeasureVisibility = (root: HTMLElement, visible: VisiblePills, overflowCount: number) => {
  root
    .querySelectorAll<HTMLElement>(`[data-test-subj="${IMPACT_PILL_TEST_SUBJ}"]`)
    .forEach((element, index) => {
      element.style.display = isVisibleIndex(index, visible) ? '' : 'none';
    });

  const overflowElement = root.querySelector<HTMLElement>(
    `[data-test-subj="${IMPACT_OVERFLOW_TEST_SUBJ}"]`
  );
  if (overflowElement) {
    overflowElement.style.display = overflowCount > 0 ? '' : 'none';
  }
};

const countPillRows = (root: HTMLElement): number => {
  const rowTops = new Set<number>();
  root.querySelectorAll<HTMLElement>(MEASURE_ITEM_SELECTOR).forEach((element) => {
    if (element.style.display !== 'none') {
      rowTops.add(element.offsetTop);
    }
  });
  return rowTops.size;
};

const visiblePillCount = ({ prefixCount, pinnedIndex }: VisiblePills): number =>
  pinnedIndex !== null && pinnedIndex >= prefixCount ? prefixCount + 1 : prefixCount;

const fitsInMaxRows = (root: HTMLElement, visible: VisiblePills, total: number): boolean => {
  setMeasureVisibility(root, visible, total - visiblePillCount(visible));
  return countPillRows(root) <= MAX_PILL_ROWS;
};

/** Largest `prefixCount` for the given pin that fits, with `+n`, in `MAX_PILL_ROWS`. */
const largestFittingPrefix = (
  root: HTMLElement,
  total: number,
  pinnedIndex: number | null,
  from: number
): number => {
  for (let candidate = from; candidate > 0; candidate -= 1) {
    if (fitsInMaxRows(root, { prefixCount: candidate, pinnedIndex }, total)) {
      return candidate;
    }
  }
  return 0;
};

/**
 * Largest prefix of `pills` that, together with the `+n` pill, fits in
 * `MAX_PILL_ROWS`. A selected pill past that prefix is pinned at the end of
 * the row instead, shortening the prefix as needed, so the active filter
 * is always visible and clearable.
 */
const findVisiblePills = (
  root: HTMLElement,
  pills: readonly ImpactPill[],
  entityFilter: string | null
): VisiblePills => {
  const total = pills.length;
  if (total === 0) {
    return { prefixCount: 0, pinnedIndex: null };
  }

  const prefixCount = largestFittingPrefix(root, total, null, total);
  const selectedIndex = entityFilter
    ? pills.findIndex((pill) => pill.entityId === entityFilter)
    : -1;
  if (selectedIndex < 0 || selectedIndex < prefixCount) {
    return { prefixCount, pinnedIndex: null };
  }

  return {
    prefixCount: largestFittingPrefix(root, total, selectedIndex, prefixCount),
    pinnedIndex: selectedIndex,
  };
};

export const Impact: React.FC<ImpactProps> = ({ items, entityFilter, onEntityFilterChange }) => {
  const { euiTheme } = useEuiTheme();
  const rowRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  const pills = useMemo(() => impactPills(items), [items]);
  const [visible, setVisible] = useState<VisiblePills>({
    prefixCount: pills.length,
    pinnedIndex: null,
  });
  const [isExpanded, setIsExpanded] = useState(false);

  const recalculateVisible = useCallback(() => {
    if (!measureRef.current) {
      return;
    }
    if (isExpanded) {
      setVisible({ prefixCount: pills.length, pinnedIndex: null });
      return;
    }
    setVisible(findVisiblePills(measureRef.current, pills, entityFilter));
  }, [entityFilter, isExpanded, pills]);

  useLayoutEffect(() => {
    recalculateVisible();

    const observer = new ResizeObserver(recalculateVisible);
    if (rowRef.current) {
      observer.observe(rowRef.current);
    }
    return () => observer.disconnect();
  }, [recalculateVisible]);

  if (pills.length === 0) {
    return null;
  }

  // Items stretch to the row height and center their pill, so every item in a
  // row shares one offsetTop regardless of pill height (the +n pill is shorter).
  const pillItemStyles = css({ justifyContent: 'center' });

  const visiblePills = pills.filter((_, index) => isVisibleIndex(index, visible));
  const overflowCount = Math.max(0, pills.length - visiblePills.length);

  const renderPill = (pill: ImpactPill, interactive: boolean) => (
    <EuiFlexItem
      key={pill.entityId}
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
      <div ref={rowRef} css={css({ position: 'relative', width: '100%' })}>
        {/* Hidden copy of every pill, used to find how many fit in MAX_PILL_ROWS. */}
        <div
          ref={measureRef}
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
            {pills.map((pill) => renderPill(pill, false))}
            <EuiFlexItem
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
          {isExpanded ? (
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
