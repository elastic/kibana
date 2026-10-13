/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiText,
  EuiTextColor,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { VcuRange } from '../../../common/vcu_estimate';
import { ILLUSTRATIVE_USD_PER_VCU_HOUR } from '../../../common/vcu_estimate';

interface ProfileEstimateProps {
  /** Omitted while the profile has invalid values. */
  estimate?: VcuRange;
  /** The saved profile's estimate, when editing, so changes can show how they compare. */
  savedEstimate?: VcuRange;
}

// Rounds to the displayed precision, so comparisons and deltas match what users see. Per-GB values
// are often below 1, so small values keep two decimals.
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
    return i18n.translate('xpack.boost.profileEstimate.costBelowOneCent', {
      defaultMessage: 'under {amount}',
      values: { amount: formatUsd(0.01) },
    });
  }
  return formatUsd(usd);
};

// The end's label follows the cost at the same size and weight, in subdued text.
const renderLabel = (chunks: ReactNode) => (
  <EuiTextColor color="subdued">
    <strong>{chunks}</strong>
  </EuiTextColor>
);

/** The cost for one end of the range, such as "$0.03 at rest". */
const CostLine = ({ end, vcus }: { end: keyof VcuRange; vcus: number }) => {
  const cost = <strong>{formatCost(vcus)}</strong>;
  return end === 'atRest' ? (
    <FormattedMessage
      id="xpack.boost.profileEstimate.atRestCost"
      defaultMessage="{cost} <label>at rest</label>"
      values={{ cost, label: renderLabel }}
    />
  ) : (
    <FormattedMessage
      id="xpack.boost.profileEstimate.atPeakCost"
      defaultMessage="{cost} <label>at peak</label>"
      values={{ cost, label: renderLabel }}
    />
  );
};

const getVcusText = (vcus: number): string =>
  i18n.translate('xpack.boost.profileEstimate.vcus', {
    defaultMessage: '{value} {count, plural, one {VCU} other {VCUs}}',
    values: { value: formatVcus(vcus), count: vcus },
  });

interface ChangeIndicatorProps {
  vcus: number;
  savedVcus: number;
}

/** Whether a value moved up (costs more) or down (costs less) from the saved profile. */
const ChangeIndicator = ({ vcus, savedVcus }: ChangeIndicatorProps) => {
  const isHigher = vcus > savedVcus;
  const deltaVcus = roundVcus(Math.abs(vcus - savedVcus));
  const cost = formatCost(deltaVcus);
  const delta = formatVcus(deltaVcus);
  const savedCost = formatCost(savedVcus);
  const difference = isHigher
    ? i18n.translate('xpack.boost.profileEstimate.increase', {
        defaultMessage: '+{cost} (+{delta} {count, plural, one {VCU} other {VCUs}})',
        values: { cost, delta, count: deltaVcus },
      })
    : i18n.translate('xpack.boost.profileEstimate.decrease', {
        defaultMessage: '−{cost} (−{delta} {count, plural, one {VCU} other {VCUs}})',
        values: { cost, delta, count: deltaVcus },
      });
  const description = isHigher
    ? i18n.translate('xpack.boost.profileEstimate.higherThanSaved', {
        defaultMessage: 'Up {cost} from {savedCost}',
        values: { cost, savedCost },
      })
    : i18n.translate('xpack.boost.profileEstimate.lowerThanSaved', {
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
  savedEstimate?: VcuRange;
}

/** One end of the range: the cost and its label, any change indicator, and the VCUs below. */
const EstimateValue = ({ end, estimate, savedEstimate }: EstimateValueProps) => {
  const vcus = roundVcus(estimate[end]);
  const savedVcus = savedEstimate && roundVcus(savedEstimate[end]);

  return (
    <div data-test-subj={`boostProfileEstimate-${end}`}>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <CostLine end={end} vcus={vcus} />
          </EuiText>
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

/** The profile's illustrative hourly cost and VCU range, updated as the form changes. */
export const ProfileEstimate = ({ estimate, savedEstimate }: ProfileEstimateProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="flexStart"
      justifyContent="spaceBetween"
      responsive={false}
      wrap
      // Matches the height of the small buttons below the divider, so both halves of the footer
      // are the same height.
      css={{ minBlockSize: euiTheme.size.xl }}
      data-test-subj="boostProfileEstimate"
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>
                {i18n.translate('xpack.boost.profileEstimate.title', {
                  defaultMessage: 'Search cost / GB / hour',
                })}
              </strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIconTip
              type="info"
              color="subdued"
              // A flex anchor sizes to the icon, so the row's flex alignment centers it. The default
              // inline-block anchor gets a line box from the inherited font, which offsets the icon.
              display="flex"
              content={i18n.translate('xpack.boost.profileEstimate.disclaimer', {
                defaultMessage:
                  'Actual usage varies with query load and your data. Costs use an illustrative rate of {rate} per VCU-hour. This is an estimate and may not represent actual pricing.',
                values: { rate: formatUsd(ILLUSTRATIVE_USD_PER_VCU_HOUR) },
              })}
              aria-label={i18n.translate('xpack.boost.profileEstimate.disclaimerLabel', {
                defaultMessage: 'About this estimate',
              })}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <div aria-live="polite">
          {estimate ? (
            <EuiFlexGroup
              // 16px around the divider, between EUI's 12px and 24px gutters.
              gutterSize="none"
              alignItems="flexStart"
              responsive={false}
              wrap
              css={{ gap: euiTheme.size.base }}
            >
              <EuiFlexItem grow={false}>
                <EstimateValue end="atRest" estimate={estimate} savedEstimate={savedEstimate} />
              </EuiFlexItem>
              {/* Decorative divider, as tall as the values beside it; EUI has no vertical rule. */}
              <EuiFlexItem
                grow={false}
                aria-hidden={true}
                css={{ alignSelf: 'stretch', borderInlineStart: euiTheme.border.thin }}
              />
              <EuiFlexItem grow={false}>
                <EstimateValue end="atPeak" estimate={estimate} savedEstimate={savedEstimate} />
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : (
            <EuiText size="s" color={euiTheme.colors.textDisabled}>
              {i18n.translate('xpack.boost.profileEstimate.unavailable', {
                defaultMessage: 'Enter valid values above to see an estimate',
              })}
            </EuiText>
          )}
        </div>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
