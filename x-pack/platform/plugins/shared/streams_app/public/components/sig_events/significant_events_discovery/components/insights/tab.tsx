/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingElastic } from '@elastic/eui';
import { useKibana } from '../../../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../../../hooks/use_streams_app_fetch';
import { SignificantEventsOnboardingEmptyPrompt } from '../../significant_events_onboarding_empty_prompt';
import { Summary } from './summary';

export function InsightsTab() {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const queriesFetch = useStreamsAppFetch(
    async ({ signal }) =>
      streamsRepositoryClient.fetch('GET /internal/streams/_queries', {
        params: {
          query: {
            from: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
            to: new Date().toISOString(),
            bucketSize: '30s',
          },
        },
        signal,
      }),
    [streamsRepositoryClient]
  );

  if (queriesFetch.loading) {
    return <EuiLoadingElastic />;
  }

  const totalEvents = queriesFetch.value?.total ?? 0;

  if (totalEvents === 0 || totalEvents === undefined) {
    return <SignificantEventsOnboardingEmptyPrompt />;
  }

  return <Summary count={totalEvents} />;
}
