/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataStreamsBoostProfile } from '../../../common/types';
import { parseMaxAge, toMaxAgeHours } from '../../../common/validation';
import type { DataStreamPeriod } from '../../../common/vcu_estimate';
import { usePeriodColors } from '../data_stream_timeline';
import { TitleWithTip } from '../details/title_with_tip';
import { formatBoost, formatMaxAge } from '../format';
import { PERIOD_LABELS } from './period_labels';

const PERIODS: readonly DataStreamPeriod[] = ['recent', 'standard', 'background'];

const BOOST_LABEL = i18n.translate('xpack.boost.phaseCards.boostLabel', {
  defaultMessage: 'Min–max boost',
});
const AGE_LABEL = i18n.translate('xpack.boost.phaseCards.ageLabel', {
  defaultMessage: 'Data age',
});
const SKIPPED_LABEL = i18n.translate('xpack.boost.phaseCards.skipped', {
  defaultMessage: 'Skipped',
});
const SKIPPED_TIP = i18n.translate('xpack.boost.phaseCards.skippedTip', {
  defaultMessage:
    'Its max age is no later than the recent max age, so it never holds data and has no part in the timeline.',
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
      defaultMessage: 'Up to {age}',
      values: { age: recentAge },
    }),
    standard: i18n.translate('xpack.boost.phaseCards.standardAge', {
      defaultMessage: '{from}–{to}',
      values: { from: recentAge, to: standardAge },
    }),
    // Without a standard phase, background data starts where recent data ends.
    background: i18n.translate('xpack.boost.phaseCards.backgroundAge', {
      defaultMessage: 'Older than {age}',
      values: { age: isStandardSkipped ? recentAge : standardAge },
    }),
  };
};

/**
 * A data streams profile's phases as cards, newest data first like the timeline, each with the
 * swatch of its timeline color, its boost, and the ages of its data. A standard phase that ends
 * where the recent one does never holds data, so its card is set back, with a badge for its ages
 * that says it's skipped.
 */
export const PhaseCards = ({ profile }: { profile: DataStreamsBoostProfile }) => {
  const { euiTheme } = useEuiTheme();
  const colors = usePeriodColors();
  const isStandardSkipped = toHours(profile.standard.max_age) <= toHours(profile.recent.max_age);
  const ageTexts = getAgeTexts(profile, isStandardSkipped);

  return (
    <EuiFlexGroup gutterSize="m" wrap data-test-subj="boostProfilePeriods">
      {PERIODS.map((period) => {
        const { min_boost: minBoost, max_boost: maxBoost } = profile[period];
        const isSkipped = period === 'standard' && isStandardSkipped;
        return (
          // Narrow cards wrap rather than squeeze their values.
          <EuiFlexItem key={period} css={{ minInlineSize: '10em' }}>
            <EuiPanel
              hasBorder={!isSkipped}
              hasShadow={false}
              color={isSkipped ? 'subdued' : 'plain'}
              paddingSize="m"
              css={{
                blockSize: '100%',
                color: isSkipped ? euiTheme.colors.textDisabled : undefined,
              }}
              data-test-subj={`boostProfilePhase-${period}`}
            >
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  {/* The phase's color in the timeline, which it leaves out when skipped. */}
                  <span
                    aria-hidden={true}
                    css={{
                      display: 'block',
                      inlineSize: euiTheme.size.m,
                      blockSize: euiTheme.size.m,
                      borderRadius: euiTheme.border.radius.small,
                      backgroundColor: isSkipped
                        ? euiTheme.colors.borderBasePlain
                        : colors[period].background,
                    }}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="s">
                    <strong>
                      <TitleWithTip
                        title={PERIOD_LABELS[period].title}
                        tip={PERIOD_LABELS[period].description}
                      />
                    </strong>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="m" />
              <EuiStat
                title={`${formatBoost(minBoost)}–${formatBoost(maxBoost)}`}
                description={BOOST_LABEL}
                // A step down from the default, so values fit the cards on one line.
                titleSize="xxs"
                titleColor={isSkipped ? euiTheme.colors.textDisabled : undefined}
                reverse
              />
              <EuiSpacer size="s" />
              <EuiStat
                title={
                  // A skipped phase holds no data, which its badge says in place of the ages.
                  isSkipped ? (
                    <EuiToolTip content={SKIPPED_TIP}>
                      <EuiBadge color="hollow" tabIndex={0}>
                        {SKIPPED_LABEL}
                      </EuiBadge>
                    </EuiToolTip>
                  ) : (
                    ageTexts[period]
                  )
                }
                description={AGE_LABEL}
                titleSize="xxs"
                titleColor={isSkipped ? euiTheme.colors.textDisabled : undefined}
                reverse
              />
            </EuiPanel>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
