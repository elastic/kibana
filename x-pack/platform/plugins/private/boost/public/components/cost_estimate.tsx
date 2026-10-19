/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';
import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiText,
  euiCanAnimate,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { BoostProfileType } from '../../common/types';
import type { CostImpact, VcuRange } from '../../common/vcu_estimate';
import {
  COST_DISCLAIMER,
  formatCost,
  formatCostRange,
  formatSize,
  formatVcus,
  getCostRangeLabel,
  getCostText,
  getVcuRangeText,
  getVcusText,
  roundVcus,
} from './cost_format';
import { DataStreamTimeline } from './data_stream_timeline';
import { formatDataSourceCount } from './format';

interface CostEstimateProps {
  /**
   * The cost of what a rule or profile applies to, today and with the change; omitted while it
   * can't be estimated.
   */
  impact?: CostImpact;
  /** The type of the data the change affects. */
  type?: BoostProfileType;
  /**
   * Whether the user is still editing the input that made the estimate unavailable. Until they
   * finish, the last estimate stays, faded; after that, it's hidden.
   */
  isEditing: boolean;
  /**
   * Whether to show how the estimate changes from today, which only means something when editing or
   * copying a saved rule or profile.
   */
  showChange: boolean;
}

interface ShownEstimate {
  impact: CostImpact;
  type: BoostProfileType;
}

interface ChangeIndicatorProps {
  vcus: number;
  savedVcus: number;
}

/** Whether a value moved up (costs more) or down (costs less) from today's. */
const ChangeIndicator = ({ vcus, savedVcus }: ChangeIndicatorProps) => {
  const isHigher = vcus > savedVcus;
  const deltaVcus = roundVcus(Math.abs(vcus - savedVcus));
  const cost = formatCost(deltaVcus);
  const delta = formatVcus(deltaVcus);
  const savedCost = formatCost(savedVcus);
  const difference = isHigher
    ? i18n.translate('xpack.boost.costEstimate.increase', {
        defaultMessage: '+{cost} (+{delta} {count, plural, one {VCU} other {VCUs}})',
        values: { cost, delta, count: deltaVcus },
      })
    : i18n.translate('xpack.boost.costEstimate.decrease', {
        defaultMessage: '−{cost} (−{delta} {count, plural, one {VCU} other {VCUs}})',
        values: { cost, delta, count: deltaVcus },
      });
  const description = isHigher
    ? i18n.translate('xpack.boost.costEstimate.higherThanSaved', {
        defaultMessage: 'Up {cost} from {savedCost}',
        values: { cost, savedCost },
      })
    : i18n.translate('xpack.boost.costEstimate.lowerThanSaved', {
        defaultMessage: 'Down {cost} from {savedCost}',
        values: { cost, savedCost },
      });

  // The tooltip shows the difference at a glance, and the accessible name adds the saved value
  // for context.
  return (
    <EuiIconTip
      type={isHigher ? 'sortUp' : 'sortDown'}
      color={isHigher ? 'danger' : 'success'}
      // A flex anchor sizes to the icon, so the row's flex alignment centers it.
      display="flex"
      content={difference}
      aria-label={description}
    />
  );
};

interface EstimateValueProps {
  end: keyof VcuRange;
  estimate: VcuRange;
  comparison?: VcuRange;
}

/** One end of the range: the cost and its label, any change indicator, and the VCUs below. */
const EstimateValue = ({ end, estimate, comparison }: EstimateValueProps) => {
  const vcus = roundVcus(estimate[end]);
  const savedVcus = comparison && roundVcus(comparison[end]);

  return (
    <div data-test-subj={`boostCostEstimate-${end}`}>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="s">{getCostText(end, vcus)}</EuiText>
        </EuiFlexItem>
        {savedVcus !== undefined && savedVcus !== vcus && (
          <EuiFlexItem grow={false}>
            <ChangeIndicator vcus={vcus} savedVcus={savedVcus} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiText size="xs" color="subdued">
        {getVcusText(vcus)}
      </EuiText>
    </div>
  );
};

interface RangeChangeIndicatorProps {
  range: VcuRange;
  savedRange: VcuRange;
}

/** Whether a range moved up (costs more) or down (costs less) from today's, led by its peak. */
const RangeChangeIndicator = ({ range, savedRange }: RangeChangeIndicatorProps) => {
  const isHigher =
    range.atPeak !== savedRange.atPeak
      ? range.atPeak > savedRange.atPeak
      : range.atRest > savedRange.atRest;
  const savedCost = formatCostRange(savedRange);

  return (
    <EuiIconTip
      type={isHigher ? 'sortUp' : 'sortDown'}
      color={isHigher ? 'danger' : 'success'}
      display="flex"
      content={i18n.translate('xpack.boost.costEstimate.previousRange', {
        defaultMessage: 'Previously {cost}',
        values: { cost: savedCost },
      })}
      aria-label={
        isHigher
          ? i18n.translate('xpack.boost.costEstimate.rangeHigherThanSaved', {
              defaultMessage: 'Up from {cost}',
              values: { cost: savedCost },
            })
          : i18n.translate('xpack.boost.costEstimate.rangeLowerThanSaved', {
              defaultMessage: 'Down from {cost}',
              values: { cost: savedCost },
            })
      }
    />
  );
};

interface RangeValueProps {
  estimate: VcuRange;
  comparison?: VcuRange;
}

/** The whole range, from at rest to at peak, with any change indicator and the VCUs below. */
const RangeValue = ({ estimate, comparison }: RangeValueProps) => {
  const range = { atRest: roundVcus(estimate.atRest), atPeak: roundVcus(estimate.atPeak) };
  const savedRange = comparison && {
    atRest: roundVcus(comparison.atRest),
    atPeak: roundVcus(comparison.atPeak),
  };
  const hasChanged =
    savedRange !== undefined &&
    (savedRange.atRest !== range.atRest || savedRange.atPeak !== range.atPeak);

  return (
    <div data-test-subj="boostCostEstimate-range">
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <span aria-hidden={true}>{formatCostRange(range)}</span>
            <EuiScreenReaderOnly>
              <span>{getCostRangeLabel(range)}</span>
            </EuiScreenReaderOnly>
          </EuiText>
        </EuiFlexItem>
        {hasChanged && savedRange && (
          <EuiFlexItem grow={false}>
            <RangeChangeIndicator range={range} savedRange={savedRange} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiText size="xs" color="subdued">
        {getVcuRangeText(range)}
      </EuiText>
    </div>
  );
};

interface EstimateContentProps {
  estimate: ShownEstimate;
  isStale: boolean;
  showChange: boolean;
}

/**
 * The estimate's title, what it covers, and its values. For data streams, the whole range sits beside
 * the title, and a timeline below splits it between the profile's periods.
 */
const EstimateContent = ({
  estimate: { impact, type },
  isStale,
  showChange,
}: EstimateContentProps) => {
  const { euiTheme } = useEuiTheme();
  const { next: estimate, dataSourceCount, sizeInBytes } = impact;
  const comparison = showChange ? impact.current : undefined;
  const periods = type === 'data_streams' ? impact.periods : undefined;

  return (
    <div
      css={{
        // A stale estimate is faded; EUI has no opacity token.
        opacity: isStale ? 0.5 : 1,
        transition: `opacity ${euiTheme.animation.fast}`,
      }}
    >
      <EuiFlexGroup
        gutterSize="s"
        alignItems="flexStart"
        justifyContent="spaceBetween"
        responsive={false}
        wrap
        css={{
          // Matches the height of the small buttons below the divider, so both halves of the
          // footer are the same height.
          minBlockSize: euiTheme.size.xl,
        }}
      >
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>
                  {i18n.translate('xpack.boost.costEstimate.title', {
                    defaultMessage: 'Search cost per hour',
                  })}
                </strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiIconTip
                type="info"
                color="subdued"
                // A flex anchor sizes to the icon, so the row's flex alignment centers it. The
                // default inline-block anchor gets a line box from the inherited font, which
                // offsets the icon.
                display="flex"
                content={COST_DISCLAIMER}
                aria-label={i18n.translate('xpack.boost.costEstimate.disclaimerLabel', {
                  defaultMessage: 'About this estimate',
                })}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.boost.costEstimate.subtitle', {
              defaultMessage: '{targets} · {size}',
              values: {
                targets: formatDataSourceCount(type, dataSourceCount),
                size: formatSize(sizeInBytes),
              },
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <div aria-live="polite">
            {isStale && (
              <EuiScreenReaderOnly>
                <span>
                  {i18n.translate('xpack.boost.costEstimate.staleLabel', {
                    defaultMessage: 'Last available estimate:',
                  })}
                </span>
              </EuiScreenReaderOnly>
            )}
            {periods ? (
              <RangeValue estimate={estimate} comparison={comparison} />
            ) : (
              <EuiFlexGroup
                // 16px around the divider, between EUI's 12px and 24px gutters.
                gutterSize="none"
                alignItems="flexStart"
                responsive={false}
                wrap
                css={{ gap: euiTheme.size.base }}
              >
                <EuiFlexItem grow={false}>
                  <EstimateValue end="atRest" estimate={estimate} comparison={comparison} />
                </EuiFlexItem>
                {/* Decorative divider, as tall as the values beside it; EUI has no vertical rule. */}
                <EuiFlexItem
                  grow={false}
                  aria-hidden={true}
                  css={{ alignSelf: 'stretch', borderInlineStart: euiTheme.border.thin }}
                />
                <EuiFlexItem grow={false}>
                  <EstimateValue end="atPeak" estimate={estimate} comparison={comparison} />
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
      {periods && (
        <>
          <EuiSpacer size="s" />
          <DataStreamTimeline
            maxAges={periods.maxAges}
            estimates={periods.estimates}
            showsCost
            testSubj="boostCostEstimateTimeline"
          />
        </>
      )}
    </div>
  );
};

/**
 * The illustrative hourly search cost of what a rule or profile applies to, compared with today, above
 * a footer's buttons. It's only shown for real data, so it's hidden until there's some to estimate.
 */
export const CostEstimate = ({ impact, type, isEditing, showChange }: CostEstimateProps) => {
  const { euiTheme } = useEuiTheme();
  const lastShownRef = useRef<ShownEstimate>();
  // The last estimate rendered, which stays while it animates out.
  const lastRenderedRef = useRef<ShownEstimate>();

  // Shown for real data: what the change covers, or, when there's a change to show, what it covered
  // before, such as a rule edited to match nothing.
  const hasData =
    impact !== undefined && (impact.dataSourceCount > 0 || (showChange && impact.hasCurrentData));
  const current = impact && hasData && type ? { impact, type } : undefined;
  const shown = current ?? (isEditing ? lastShownRef.current : undefined);
  useEffect(() => {
    lastShownRef.current = shown;
    if (shown) {
      lastRenderedRef.current = shown;
    }
  });

  // Before anything has been estimated, the empty row is still rendered, collapsed, so the first
  // estimate animates in too.
  const rendered = shown ?? lastRenderedRef.current;
  const isShown = shown !== undefined;
  const isStale = isShown && current === undefined;

  // The divider sits this far above the buttons, with the same space between it and the estimate.
  const dividerGap = euiTheme.size.m;
  const fade = css`
    opacity: ${isShown ? 1 : 0};
    ${euiCanAnimate} {
      transition: opacity ${euiTheme.animation.normal} ${euiTheme.animation.resistance};
    }
  `;

  return (
    <div
      // The row grows and shrinks with the estimate anchored to its top, so the estimate rises and
      // falls with the footer's top edge as it fades in and out. Once collapsed, it's hidden from
      // everyone.
      css={css`
        position: relative;
        display: grid;
        grid-template-rows: ${isShown ? '1fr' : '0fr'};
        visibility: ${isShown ? 'visible' : 'hidden'};
        ${euiCanAnimate} {
          transition-property: grid-template-rows, visibility;
          transition-duration: ${euiTheme.animation.normal};
          transition-timing-function: ${euiTheme.animation.resistance};
        }
      `}
      data-test-subj="boostCostEstimate"
      data-shown={isShown}
      data-stale={isStale}
    >
      {/* Clipped at the divider, which doesn't move, so the estimate slides out from behind it and
          back in. */}
      <div
        css={[
          fade,
          css`
            min-block-size: 0;
            clip-path: inset(0 0 calc(${dividerGap} + ${euiTheme.border.width.thin}) 0);
          `,
        ]}
      >
        <div
          css={css`
            padding-block-end: calc(${dividerGap} * 2 + ${euiTheme.border.width.thin});
          `}
        >
          {rendered && (
            <EstimateContent estimate={rendered} isStale={isStale} showChange={showChange} />
          )}
        </div>
      </div>
      {/* The divider stays put above the buttons, edge to edge through the footer's 16px padding,
          and only fades, so it doesn't move with the estimate. */}
      <div
        aria-hidden={true}
        css={[
          fade,
          css`
            position: absolute;
            inset-block-end: ${dividerGap};
            inset-inline: -${euiTheme.size.base};
            border-block-start: ${euiTheme.border.thin};
          `,
        ]}
      />
    </div>
  );
};
