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
  EuiText,
  euiCanAnimate,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { BoostProfileType } from '../../common/types';
import type { CostImpact, VcuRange } from '../../common/vcu_estimate';
import { ILLUSTRATIVE_USD_PER_VCU_HOUR } from '../../common/vcu_estimate';
import { formatDataSourceCount } from './format';

interface CostEstimateProps {
  /** The cost of the data a change affects, before and after; omitted while it can't be estimated. */
  impact?: CostImpact;
  /** The type of the data the change affects. */
  type?: BoostProfileType;
  /**
   * Whether the user is still editing the input that made the estimate unavailable. Until they
   * finish, the last estimate stays, faded; after that, it's hidden.
   */
  isEditing: boolean;
}

interface ShownEstimate {
  impact: CostImpact;
  type: BoostProfileType;
}

const formatSize = (bytes: number): string =>
  i18n.translate('xpack.boost.costEstimate.sizeInGb', {
    defaultMessage: '{size} GB',
    values: {
      size: new Intl.NumberFormat(i18n.getLocale(), {
        maximumFractionDigits: bytes < 1e9 ? 2 : 1,
      }).format(bytes / 1e9),
    },
  });

// Rounds to the displayed precision, so comparisons and deltas match what users see. Small data
// often costs below 1 VCU, so small values keep two decimals.
const roundVcus = (vcus: number): number => {
  const decimals = vcus < 1 ? 2 : vcus < 10 ? 1 : 0;
  return Math.round(vcus * 10 ** decimals) / 10 ** decimals;
};

const formatVcus = (vcus: number): string =>
  new Intl.NumberFormat(i18n.getLocale(), { maximumFractionDigits: 2 }).format(vcus);

const formatUsd = (usd: number): string =>
  new Intl.NumberFormat(i18n.getLocale(), {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: usd >= 100 ? 0 : 2,
  }).format(usd);

/** The hourly cost of this many VCUs. */
const formatCost = (vcus: number): string => {
  const usd = vcus * ILLUSTRATIVE_USD_PER_VCU_HOUR;
  if (usd > 0 && usd < 0.01) {
    return i18n.translate('xpack.boost.costEstimate.costBelowOneCent', {
      defaultMessage: '<{amount}',
      values: { amount: formatUsd(0.01) },
    });
  }
  return formatUsd(usd);
};

/** The cost for one end of the range, such as "$0.03 at rest". */
const getCostText = (end: keyof VcuRange, vcus: number): string =>
  end === 'atRest'
    ? i18n.translate('xpack.boost.costEstimate.atRestCost', {
        defaultMessage: '{cost} at rest',
        values: { cost: formatCost(vcus) },
      })
    : i18n.translate('xpack.boost.costEstimate.atPeakCost', {
        defaultMessage: '{cost} at peak',
        values: { cost: formatCost(vcus) },
      });

const getVcusText = (vcus: number): string =>
  i18n.translate('xpack.boost.costEstimate.vcus', {
    defaultMessage: '{value} {count, plural, one {VCU} other {VCUs}}',
    values: { value: formatVcus(vcus), count: vcus },
  });

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

interface EstimateContentProps {
  estimate: ShownEstimate;
  isStale: boolean;
}

/** The estimate's title, what it covers, and its values. */
const EstimateContent = ({ estimate: { impact, type }, isStale }: EstimateContentProps) => {
  const { euiTheme } = useEuiTheme();
  const { next: estimate, current: comparison, dataSourceCount, sizeInBytes } = impact;

  return (
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
        // A stale estimate is faded; EUI has no opacity token.
        opacity: isStale ? 0.5 : 1,
        transition: `opacity ${euiTheme.animation.fast}`,
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
              content={i18n.translate('xpack.boost.costEstimate.disclaimer', {
                defaultMessage:
                  'Actual usage varies with query load and your data. Costs use an illustrative rate of {rate} per VCU-hour. This is an estimate and may not represent actual pricing.',
                values: { rate: formatUsd(ILLUSTRATIVE_USD_PER_VCU_HOUR) },
              })}
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
        </div>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

/**
 * The illustrative hourly search cost of the data a change affects, compared with today, above a
 * footer's buttons. It's only shown for real data, so it's hidden until there's some to estimate.
 */
export const CostEstimate = ({ impact, type, isEditing }: CostEstimateProps) => {
  const { euiTheme } = useEuiTheme();
  const lastShownRef = useRef<ShownEstimate>();
  // The last estimate rendered, which stays while it animates out.
  const lastRenderedRef = useRef<ShownEstimate>();

  const current = impact && impact.dataSourceCount > 0 && type ? { impact, type } : undefined;
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
          {rendered && <EstimateContent estimate={rendered} isStale={isStale} />}
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
