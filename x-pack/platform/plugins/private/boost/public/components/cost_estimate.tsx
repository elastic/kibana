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
  EuiNotificationBadge,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiText,
  euiCanAnimate,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { BoostProfileType } from '../../common/types';
import type { CostImpact, VcuRange } from '../../common/vcu_estimate';
import { COST_DISCLAIMER, formatCost, formatSize, getVcusText, roundVcus } from './cost_format';
import { useShowsEstimates } from '../prototype/estimates_setting';
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
  end: keyof VcuRange;
  vcus: number;
  savedVcus: number;
}

/** Whether one end of the range moved up (costs more) or down (costs less) from today's. */
const ChangeIndicator = ({ end, vcus, savedVcus }: ChangeIndicatorProps) => {
  const isHigher = vcus > savedVcus;
  const savedCost = formatCost(savedVcus);

  return (
    <EuiIconTip
      type={isHigher ? 'sortUp' : 'sortDown'}
      color={isHigher ? 'danger' : 'success'}
      // A flex anchor sizes to the icon, so the row's flex alignment centers it.
      display="flex"
      title={i18n.translate('xpack.boost.costEstimate.previousTitle', {
        defaultMessage: 'Previously',
      })}
      content={
        <>
          <div>{savedCost}</div>
          <div>{getVcusText(savedVcus)}</div>
        </>
      }
      aria-label={
        isHigher
          ? i18n.translate('xpack.boost.costEstimate.higherThanSaved', {
              defaultMessage: '{end, select, atRest {At rest} other {At peak}}, up from {cost}',
              values: { end, cost: savedCost },
            })
          : i18n.translate('xpack.boost.costEstimate.lowerThanSaved', {
              defaultMessage: '{end, select, atRest {At rest} other {At peak}}, down from {cost}',
              values: { end, cost: savedCost },
            })
      }
    />
  );
};

interface EstimateValueProps {
  end: keyof VcuRange;
  /** The end's search VCUs, rounded as shown. */
  vcus: number;
  /** Today's, when there's a change to show. */
  savedVcus?: number;
}

/** One end of the range: its cost and what it is, any change indicator, and its VCUs below. */
const EstimateValue = ({ end, vcus, savedVcus }: EstimateValueProps) => (
  <div data-test-subj={`boostCostEstimate-${end}`}>
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText size="xs">
          {end === 'atRest' ? (
            <FormattedMessage
              id="xpack.boost.costEstimate.atRestValue"
              defaultMessage="{cost} at rest"
              values={{ cost: formatCost(vcus) }}
            />
          ) : (
            <FormattedMessage
              id="xpack.boost.costEstimate.atPeakValue"
              defaultMessage="{cost} at peak"
              values={{ cost: formatCost(vcus) }}
            />
          )}
        </EuiText>
      </EuiFlexItem>
      {savedVcus !== undefined && savedVcus !== vcus && (
        <EuiFlexItem grow={false}>
          <ChangeIndicator end={end} vcus={vcus} savedVcus={savedVcus} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
    <EuiText size="xs" color="subdued">
      {getVcusText(vcus)}
    </EuiText>
  </div>
);

interface EstimateValuesProps {
  estimate: VcuRange;
  comparison?: VcuRange;
}

/**
 * Both ends of the range, at rest and at peak, side by side with a divider between, each with its
 * own change indicator, since they can move in opposite directions.
 */
const EstimateValues = ({ estimate, comparison }: EstimateValuesProps) => {
  const { euiTheme } = useEuiTheme();
  const renderValue = (end: keyof VcuRange) => (
    <EstimateValue
      end={end}
      vcus={roundVcus(estimate[end])}
      savedVcus={comparison && roundVcus(comparison[end])}
    />
  );

  return (
    <EuiFlexGroup
      // 16px around the divider, between EUI's 12px and 24px gutters.
      gutterSize="none"
      alignItems="flexStart"
      responsive={false}
      wrap
      css={{ gap: euiTheme.size.base }}
    >
      <EuiFlexItem grow={false}>{renderValue('atRest')}</EuiFlexItem>
      {/* Decorative divider, as tall as the values beside it; EUI has no vertical rule. */}
      <EuiFlexItem
        grow={false}
        aria-hidden={true}
        css={{ alignSelf: 'stretch', borderInlineStart: euiTheme.border.thin }}
      />
      <EuiFlexItem grow={false}>{renderValue('atPeak')}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

interface EstimateContentProps {
  estimate: ShownEstimate;
  isStale: boolean;
  showChange: boolean;
  /** Whether to show the search cost and VCUs, which the prototype's testers can turn off. */
  showsCost: boolean;
}

/**
 * The estimate as a stat: its title, with what it covers on the right, then its cost range and VCUs
 * below it. For data streams, a timeline below splits it between the profile's periods. Without
 * the cost, what it covers and the timeline remain, under a title that says so.
 */
const EstimateContent = ({
  estimate: { impact, type },
  isStale,
  showChange,
  showsCost,
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
        alignItems="center"
        justifyContent="spaceBetween"
        responsive={false}
        wrap
      >
        <EuiFlexItem grow={false}>
          {showsCost ? (
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="xs">
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
                  size="s"
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
          ) : (
            <EuiText size="xs">
              <strong>
                {i18n.translate('xpack.boost.costEstimate.appliesToTitle', {
                  defaultMessage: 'Applies to',
                })}
              </strong>
            </EuiText>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {/* How many it covers, and how much data, as on the project default panels. */}
          <EuiFlexGroup gutterSize="s" responsive={false} aria-live="polite">
            <EuiNotificationBadge color="subdued" size="s" data-test-subj="boostCostEstimateCount">
              {formatDataSourceCount(type, dataSourceCount)}
            </EuiNotificationBadge>
            <EuiNotificationBadge color="subdued" size="s" data-test-subj="boostCostEstimateSize">
              {formatSize(sizeInBytes)}
            </EuiNotificationBadge>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      {showsCost && (
        <>
          <EuiSpacer size="s" />
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
            <EstimateValues estimate={estimate} comparison={comparison} />
          </div>
        </>
      )}
      {periods && (
        <>
          <EuiSpacer size="s" />
          <DataStreamTimeline
            maxAges={periods.maxAges}
            boosts={periods.boosts}
            estimates={periods.estimates}
            showsCost
            testSubj="boostCostEstimateTimeline"
          />
        </>
      )}
    </div>
  );
};

const CostEstimateContent = ({
  impact,
  type,
  isEditing,
  showChange,
  showsCost,
}: CostEstimateProps & { showsCost: boolean }) => {
  const { euiTheme } = useEuiTheme();
  const lastShownRef = useRef<ShownEstimate>();
  // The last estimate rendered, which stays while it animates out.
  const lastRenderedRef = useRef<ShownEstimate>();

  // Shown for real data: what the change covers, or, when there's a change to show, what it covered
  // before, such as a rule edited to match nothing.
  const hasData =
    impact !== undefined && (impact.dataSourceCount > 0 || (showChange && impact.hasCurrentData));
  const current = impact && hasData && type ? { impact, type } : undefined;
  // A faded estimate stays while the profile is cleared, but not once one of another type is chosen:
  // an indices estimate has no periods, and a data streams one has periods indices don't.
  const lastShown = lastShownRef.current;
  const isSameType = type === undefined || lastShown?.type === type;
  const shown = current ?? (isEditing && isSameType ? lastShown : undefined);
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
          back in. The clip reaches a little past the sides, so the timeline's first age, centered
          on its tick at the edge, shows in full. Its overflow is clipped too, so a collapsed
          estimate doesn't overflow the footer, which would let the flyout scroll past it. */}
      <div
        css={[
          fade,
          css`
            min-block-size: 0;
            overflow: hidden;
            margin-inline: -${euiTheme.size.s};
            padding-inline: ${euiTheme.size.s};
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
            <EstimateContent
              estimate={rendered}
              isStale={isStale}
              showChange={showChange}
              showsCost={showsCost}
            />
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

/**
 * The illustrative hourly search cost of what a rule or profile applies to, compared with today, above
 * a footer's buttons. It's only shown for real data, so it's hidden until there's some to estimate.
 */
export const CostEstimate = (props: CostEstimateProps) => (
  // The cost only while the prototype shows estimates, which testers can turn off.
  <CostEstimateContent {...props} showsCost={useShowsEstimates()} />
);
