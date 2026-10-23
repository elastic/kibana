/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, EuiTextColor, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataStreamsBoostProfile } from '../../../common/types';
import { parseMaxAge, toMaxAgeHours } from '../../../common/validation';
import type { DataStreamPeriod } from '../../../common/vcu_estimate';
import { usePeriodColors } from '../data_stream_timeline';
import { DetailsList } from '../details/details_list';
import { formatMaxAge, formatPhaseBoost } from '../format';
import { PERIOD_LABELS } from './period_labels';

const PERIODS: readonly DataStreamPeriod[] = ['recent', 'standard', 'background'];

const SKIPPED_LABEL = i18n.translate('xpack.boost.phaseCards.skipped', {
  defaultMessage: 'Skipped',
});
const SKIPPED_REASON = i18n.translate('xpack.boost.phaseCards.skippedReason', {
  defaultMessage:
    "It's skipped: its max age is no later than the recent max age, so it never holds data and has no part in the timeline.",
});

const toHours = (maxAge: string | undefined): number => {
  const parsed = parseMaxAge(maxAge);
  return parsed ? toMaxAgeHours(parsed) : 0;
};

/** The ages of the data in each phase, as the timeline lays them out. */
const getAgeTexts = (
  profile: DataStreamsBoostProfile,
  isStandardSkipped: boolean
): Record<DataStreamPeriod, string> => {
  const recentAge = formatMaxAge(profile.recent.max_age) ?? '—';
  const standardAge = formatMaxAge(profile.standard.max_age) ?? '—';
  return {
    recent: i18n.translate('xpack.boost.phaseCards.recentAge', {
      defaultMessage: 'Data up to {age} old',
      values: { age: recentAge },
    }),
    standard: i18n.translate('xpack.boost.phaseCards.standardAge', {
      defaultMessage: 'Data {from}–{to} old',
      values: { from: recentAge, to: standardAge },
    }),
    // Without a standard phase, background data starts where recent data ends.
    background: i18n.translate('xpack.boost.phaseCards.backgroundAge', {
      defaultMessage: 'Data older than {age}',
      values: { age: isStandardSkipped ? recentAge : standardAge },
    }),
  };
};

/**
 * A data streams profile's phases, newest data first like the timeline, in the same list as the
 * page's other settings and usage: each with the swatch of its timeline color, its boost, and the
 * ages of its data below, as a usage value has its share below. A standard phase that ends where
 * the recent one does never holds data, so it's disabled, saying only that it's skipped, and why in
 * its tooltip.
 */
export const PhaseList = ({ profile }: { profile: DataStreamsBoostProfile }) => {
  const { euiTheme } = useEuiTheme();
  const colors = usePeriodColors();
  const isStandardSkipped = toHours(profile.standard.max_age) <= toHours(profile.recent.max_age);
  const ageTexts = getAgeTexts(profile, isStandardSkipped);

  return (
    <div data-test-subj="boostProfilePeriods">
      <DetailsList
        items={PERIODS.map((period) => {
          const { min_boost: minBoost, max_boost: maxBoost } = profile[period];
          const isSkipped = period === 'standard' && isStandardSkipped;
          return {
            title: PERIOD_LABELS[period].title,
            // A skipped phase's tooltip also says why it's skipped.
            tip: isSkipped
              ? `${PERIOD_LABELS[period].description} ${SKIPPED_REASON}`
              : PERIOD_LABELS[period].description,
            isDisabled: isSkipped,
            // The phase's color in the timeline, which leaves it out when skipped.
            titlePrepend: (
              <span
                aria-hidden={true}
                css={{
                  display: 'inline-block',
                  inlineSize: euiTheme.size.m,
                  blockSize: euiTheme.size.m,
                  marginInlineEnd: euiTheme.size.s,
                  verticalAlign: 'middle',
                  borderRadius: euiTheme.border.radius.small,
                  backgroundColor: isSkipped
                    ? euiTheme.colors.borderBasePlain
                    : colors[period].background,
                }}
              />
            ),
            // A skipped phase has no data to boost, so it only says it's skipped.
            description: isSkipped ? (
              <EuiTextColor
                color={euiTheme.colors.textDisabled}
                data-test-subj={`boostProfilePhase-${period}`}
              >
                {SKIPPED_LABEL}
              </EuiTextColor>
            ) : (
              <div data-test-subj={`boostProfilePhase-${period}`}>
                <div>{formatPhaseBoost(minBoost, maxBoost)}</div>
                <EuiText size="xs" color="subdued">
                  {ageTexts[period]}
                </EuiText>
              </div>
            ),
          };
        })}
      />
    </div>
  );
};
