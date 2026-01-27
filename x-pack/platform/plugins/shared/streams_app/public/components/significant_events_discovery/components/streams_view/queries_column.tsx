/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText } from '@elastic/eui';
import { css } from '@emotion/css';
import type { InsightsOnboardingResult } from '@kbn/streams-schema/src/insights';
import type { TaskResult } from '@kbn/streams-schema/src/tasks/types';
import React from 'react';
import { useFetchSignificantEvents } from '../../../../hooks/use_fetch_significant_events';

interface QueriesColumnProps {
  streamName: string;
  streamInsightsOnboardingResult?: TaskResult<InsightsOnboardingResult>;
}

export function QueriesColumn({ streamName, streamInsightsOnboardingResult }: QueriesColumnProps) {
  const significantEventsFetchState = useFetchSignificantEvents(
    {
      name: streamName,
    },
    [streamInsightsOnboardingResult]
  );

  return (
    <EuiText
      size="s"
      className={css`
        text-align: center;
        font-family: 'Roboto Mono', monospace;
      `}
    >
      {significantEventsFetchState.data?.significant_events.length || '—'}
    </EuiText>
  );
}
