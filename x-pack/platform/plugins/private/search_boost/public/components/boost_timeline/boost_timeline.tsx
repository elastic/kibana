/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { LifecycleTimelinePeriod } from '@kbn/data-lifecycle-phases';
import {
  getLifecycleTimelineLayout,
  LifecycleTimelineContainer,
  LifecycleTimelineTicks,
  LifecycleTimelineTrack,
} from '@kbn/data-lifecycle-phases';
import type { DataStreamsBoostProfile } from '../../../common/types';
import { formatPeriodBoost } from '../../translations';
import { formatBoostRange, getBoostPeriods } from './boost_periods';
import { useBoostPeriodColors } from './use_boost_period_colors';

const ARIA_LABEL = i18n.translate('xpack.searchBoost.boostTimeline.ariaLabel', {
  defaultMessage: 'Boost periods by age of data',
});

export interface BoostTimelineProps {
  profile: DataStreamsBoostProfile;
  'data-test-subj'?: string;
}

/** The periods of a data streams boost profile by age of data. Skipped periods are left out. */
export const BoostTimeline = ({
  profile,
  'data-test-subj': dataTestSubj = 'searchBoostTimeline',
}: BoostTimelineProps) => {
  const colors = useBoostPeriodColors();

  const periods: LifecycleTimelinePeriod[] = getBoostPeriods(profile)
    .filter(({ skippedReason }) => !skippedReason)
    .map(({ id, label, boost, maxAge }) => ({
      id,
      label,
      color: colors[id],
      maxAge,
      tooltipContent: formatPeriodBoost(formatBoostRange(boost)),
    }));
  const layout = getLifecycleTimelineLayout(periods);

  // Built from the layers, since `LifecycleTimeline` always shows the retention at the end.
  return (
    <LifecycleTimelineContainer data-test-subj={dataTestSubj}>
      <LifecycleTimelineTrack
        items={layout.periods}
        grid={layout.grid}
        aria-label={ARIA_LABEL}
        testSubjPrefix={dataTestSubj}
      />
      <LifecycleTimelineTicks
        ticks={layout.ticks}
        grid={layout.grid}
        testSubjPrefix={dataTestSubj}
      />
    </LifecycleTimelineContainer>
  );
};
