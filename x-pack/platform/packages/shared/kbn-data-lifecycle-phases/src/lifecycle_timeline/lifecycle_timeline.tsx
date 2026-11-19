/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { getLifecycleTimelineLayout } from './get_lifecycle_timeline_layout';
import { LifecycleTimelineContainer } from './lifecycle_timeline_container';
import { LifecycleTimelineTicks } from './lifecycle_timeline_ticks';
import { LifecycleTimelineTrack } from './lifecycle_timeline_track';
import type { LifecycleTimelinePeriod } from './types';

export interface LifecycleTimelineProps {
  /** In order. Periods with an empty age range are left out. */
  periods: LifecycleTimelinePeriod[];
  /** Accessible label of the list of periods. */
  'aria-label': string;
  /** Shown at the end of the timeline. Leave it out for "∞". */
  retention?: string;
  'data-test-subj'?: string;
}

export const LifecycleTimeline = ({
  periods,
  'aria-label': ariaLabel,
  retention,
  'data-test-subj': dataTestSubj = 'lifecycleTimeline',
}: LifecycleTimelineProps) => {
  const layout = useMemo(
    () => getLifecycleTimelineLayout(periods, retention),
    [periods, retention]
  );

  if (layout.periods.length === 0) return null;

  return (
    <LifecycleTimelineContainer data-test-subj={dataTestSubj}>
      <LifecycleTimelineTrack
        items={layout.periods}
        grid={layout.grid}
        aria-label={ariaLabel}
        testSubjPrefix={dataTestSubj}
      />
      <LifecycleTimelineTicks
        ticks={layout.ticks}
        grid={layout.grid}
        endLabel={layout.endLabel}
        testSubjPrefix={dataTestSubj}
      />
    </LifecycleTimelineContainer>
  );
};
