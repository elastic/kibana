/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiText, useEuiTheme } from '@elastic/eui';
import { getTicksStyles } from './styles';
import type {
  LifecycleTimelineEndLabel,
  LifecycleTimelineGrid,
  LifecycleTimelineTick,
} from './types';

export interface LifecycleTimelineTicksProps {
  ticks: LifecycleTimelineTick[];
  grid: LifecycleTimelineGrid;
  /** Shown at the end of the last tick's column. */
  endLabel?: LifecycleTimelineEndLabel;
  testSubjPrefix?: string;
}

/** Boundary labels under the track. Hidden from screen readers: the bars carry their age range. */
export const LifecycleTimelineTicks = ({
  ticks,
  grid,
  endLabel,
  testSubjPrefix = 'lifecycleTimeline',
}: LifecycleTimelineTicksProps) => {
  const { euiTheme } = useEuiTheme();
  const styles = getTicksStyles(euiTheme, grid);
  const lastIndex = ticks.length - 1;

  return (
    <div css={styles.ticks} aria-hidden={true}>
      {ticks.map(({ id, label, gridColumn, isInvalid, 'data-test-subj': tickTestSubj }, index) => (
        <div key={id} css={{ gridColumn }}>
          <div css={[styles.tickLine, index === 0 && styles.firstTickLine]} />
          <EuiFlexGroup
            justifyContent="spaceBetween"
            gutterSize="none"
            responsive={false}
            css={styles.tickLabels}
          >
            <EuiText
              size="xs"
              color={isInvalid ? 'danger' : 'subdued'}
              css={styles.startLabel}
              data-test-subj={
                tickTestSubj ?? `${testSubjPrefix}-tick-${id}${isInvalid ? '-invalid' : ''}`
              }
            >
              {label}
            </EuiText>
            {index === lastIndex && endLabel !== undefined && (
              <EuiText
                size="xs"
                color="subdued"
                css={endLabel.isInfinite && styles.endLabel}
                data-test-subj={endLabel['data-test-subj'] ?? `${testSubjPrefix}-retention`}
              >
                {endLabel.label}
              </EuiText>
            )}
          </EuiFlexGroup>
        </div>
      ))}
    </div>
  );
};
