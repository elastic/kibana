/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut } from '@elastic/eui';
import { useKibana } from '../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../hooks/use_streams_app_fetch';
import { Summary } from './summary';
import { NoQueriesState } from './no_queries_state';

export function SignificantEventsSummary() {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const queriesFetch = useStreamsAppFetch(
    async ({ signal }) =>
      streamsRepositoryClient.fetch('GET /internal/streams/_significant_events/_queries', {
        signal,
      }),
    [streamsRepositoryClient]
  );

  if (queriesFetch.loading) {
    return (
      <EuiCallOut
        announceOnMount={false}
        title={i18n.translate('xpack.streams.significantEventsSummary.loadingSummaryTitle', {
          defaultMessage: 'Loading Significant events summary...',
        })}
        color="primary"
        iconType="flask"
      />
    );
  }

  if (queriesFetch.value?.queries.length === 0) {
    return <NoQueriesState />;
  }

  return <Summary />;
}
