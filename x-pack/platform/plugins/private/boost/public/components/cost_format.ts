/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { VcuRange } from '../../common/vcu_estimate';
import { ILLUSTRATIVE_USD_PER_VCU_HOUR } from '../../common/vcu_estimate';

/** A data size, such as "12 GB". */
export const formatSize = (bytes: number): string =>
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
export const roundVcus = (vcus: number): number => {
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
export const formatCost = (vcus: number): string => {
  const usd = vcus * ILLUSTRATIVE_USD_PER_VCU_HOUR;
  if (usd > 0 && usd < 0.01) {
    return i18n.translate('xpack.boost.costEstimate.costBelowOneCent', {
      defaultMessage: '<{amount}',
      values: { amount: formatUsd(0.01) },
    });
  }
  return formatUsd(usd);
};

/** How an estimate is made, and that it isn't pricing. */
export const COST_DISCLAIMER = i18n.translate('xpack.boost.costEstimate.disclaimer', {
  defaultMessage:
    'Actual usage varies with query load and your data. Costs use an illustrative rate of {rate} per VCU-hour. This is an estimate and may not represent actual pricing.',
  values: { rate: formatUsd(ILLUSTRATIVE_USD_PER_VCU_HOUR) },
});

/** The cost for one end of the range, such as "$0.03 at rest". */
export const getCostText = (end: keyof VcuRange, vcus: number): string =>
  end === 'atRest'
    ? i18n.translate('xpack.boost.costEstimate.atRestCost', {
        defaultMessage: '{cost} at rest',
        values: { cost: formatCost(vcus) },
      })
    : i18n.translate('xpack.boost.costEstimate.atPeakCost', {
        defaultMessage: '{cost} at peak',
        values: { cost: formatCost(vcus) },
      });

/** A number of search VCUs, such as "1.2 VCUs". */
const getVcusText = (vcus: number): string =>
  i18n.translate('xpack.boost.costEstimate.vcus', {
    defaultMessage: '{value} {count, plural, one {VCU} other {VCUs}}',
    values: { value: formatVcus(vcus), count: vcus },
  });

/** A cost range per hour, such as "$0.03–$1.20", or one cost when both ends round the same. */
export const formatCostRange = ({ atRest, atPeak }: VcuRange): string => {
  const restCost = formatCost(roundVcus(atRest));
  const peakCost = formatCost(roundVcus(atPeak));
  return restCost === peakCost
    ? restCost
    : i18n.translate('xpack.boost.costFormat.costRange', {
        defaultMessage: '{atRest}–{atPeak}',
        values: { atRest: restCost, atPeak: peakCost },
      });
};

/** A cost range per hour in words, for screen readers and tooltips. */
export const getCostRangeLabel = ({ atRest, atPeak }: VcuRange): string =>
  i18n.translate('xpack.boost.costFormat.costRangeLabel', {
    defaultMessage: '{atRest} at rest to {atPeak} at peak',
    values: { atRest: formatCost(roundVcus(atRest)), atPeak: formatCost(roundVcus(atPeak)) },
  });

/** A range of search VCUs, such as "1.2–34 VCUs". */
export const getVcuRangeText = ({ atRest, atPeak }: VcuRange): string => {
  const rest = roundVcus(atRest);
  const peak = roundVcus(atPeak);
  return rest === peak
    ? getVcusText(peak)
    : i18n.translate('xpack.boost.costFormat.vcuRange', {
        defaultMessage: '{atRest}–{atPeak} {count, plural, one {VCU} other {VCUs}}',
        values: { atRest: formatVcus(rest), atPeak: formatVcus(peak), count: peak },
      });
};
