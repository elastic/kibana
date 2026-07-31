/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiI18nNumber, EuiText } from '@elastic/eui';
import { css } from '@emotion/css';
import type { SignificantEventsWorkflowStatusResult } from '@kbn/significant-events-schema';
import React from 'react';
import { useFetchDiscoveryQueries } from '../../../../../hooks/significant_events/use_fetch_discovery_queries';

const ACTIVE_DRAFT_STATUS = ['active', 'draft'] as const;

interface QueriesColumnProps {
  streamName: string;
  streamOnboardingResult?: SignificantEventsWorkflowStatusResult;
}

export function QueriesColumn({ streamName, streamOnboardingResult }: QueriesColumnProps) {
  const queriesFetchState = useFetchDiscoveryQueries(
    {
      name: streamName,
      query: '',
      page: 1,
      perPage: 1,
      status: [...ACTIVE_DRAFT_STATUS],
    },
    [streamOnboardingResult]
  );

  const isCountLoading = queriesFetchState.isLoading || queriesFetchState.isFetching;
  const totalCount = queriesFetchState.data?.total ?? 0;

  return (
    <EuiText
      size="s"
      className={css`
        text-align: center;
        font-family: 'Roboto Mono', monospace;
      `}
    >
      {isCountLoading || queriesFetchState.isError ? (
        '—'
      ) : totalCount ? (
        <EuiI18nNumber value={totalCount} />
      ) : (
        '—'
      )}
    </EuiText>
  );
}
