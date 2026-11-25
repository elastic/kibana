/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import { LifecycleTimelinePeriodBar } from './lifecycle_timeline_period';
import { getTrackStyles } from './styles';
import type { LifecycleTimelineGrid, LifecycleTimelineTrackItem } from './types';

export interface LifecycleTimelineTrackProps {
  items: LifecycleTimelineTrackItem[];
  grid: LifecycleTimelineGrid;
  /** Accessible label of the list of periods. */
  'aria-label': string;
  testSubjPrefix?: string;
}

export const LifecycleTimelineTrack = ({
  items,
  grid,
  'aria-label': ariaLabel,
  testSubjPrefix = 'lifecycleTimeline',
}: LifecycleTimelineTrackProps) => {
  const { euiTheme } = useEuiTheme();
  const styles = getTrackStyles(euiTheme, grid);

  return (
    <ul css={styles.track} aria-label={ariaLabel}>
      {items.map((item) => (
        <li key={item.period.id} css={[styles.periodCell, { gridColumn: item.gridColumn }]}>
          <LifecycleTimelinePeriodBar item={item} testSubjPrefix={testSubjPrefix} />
        </li>
      ))}
    </ul>
  );
};
