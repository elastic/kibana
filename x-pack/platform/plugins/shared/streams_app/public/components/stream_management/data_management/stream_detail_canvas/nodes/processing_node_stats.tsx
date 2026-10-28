/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiText, useEuiTheme } from '@elastic/eui';
import { getSlotProcessorIds, type ProcessingNodeRef } from '../../../../../services/unit_graph';
import {
  formatDuration,
  formatEventsRate,
} from '../../../../../services/unit_stats_client/format_stats';
import { useSlotStats } from '../../../../unit_stats/state_management/use_stats_manager';
import { useCanvasPersistedUnit } from '../state_management';

interface ProcessingNodeStatsProps {
  slot: ProcessingNodeRef;
}

/**
 * The stats row of a processing node: the records per second that reach the slot, and the time a
 * record spends in it. It is its own component, so a stats update re-renders only this row. It
 * reads the saved unit, because the stats describe what is deployed. Until the first result
 * arrives the row keeps its space and shows nothing, so a load or a failure never looks like a
 * measured zero.
 */
export function ProcessingNodeStats({ slot }: ProcessingNodeStatsProps) {
  const { euiTheme } = useEuiTheme();
  const unit = useCanvasPersistedUnit();
  const processorIds = useMemo(() => getSlotProcessorIds(unit, slot), [unit, slot]);
  const stats = useSlotStats({ ref: slot, processorIds });

  return (
    <div
      data-test-subj="streamsCanvasProcessingNodeStats"
      css={css`
        display: flex;
        align-items: center;
        gap: ${euiTheme.size.s};
        min-height: ${euiTheme.size.l};
      `}
    >
      {stats.status === 'ready' && (
        <>
          <EuiText size="xs" data-test-subj="streamsCanvasProcessingNodeRate">
            {formatEventsRate(stats.eventsRate)}
          </EuiText>
          <EuiText size="xs" color="subdued" data-test-subj="streamsCanvasProcessingNodeDuration">
            {formatDuration(stats.durationAverage)}
          </EuiText>
        </>
      )}
    </div>
  );
}
