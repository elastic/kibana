/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiLink } from '@elastic/eui';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { useKibana } from '../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../hooks/use_streams_app_fetch';
import { Occurrences } from './occurrences';

export function Summary() {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const router = useStreamsAppRouter();

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
    return (
      <EuiCallOut
        announceOnMount={false}
        title={i18n.translate('xpack.streams.significantEventsSummary.noQueriesTitle', {
          defaultMessage: 'No Significant event queries created yet',
        })}
        color="primary"
        iconType="flask"
      >
        <p>
          {i18n.translate('xpack.streams.significantEventsSummary.noQueriesDescription', {
            defaultMessage:
              'Get started by creating Significant event queries to help identify key events in your data.',
          })}
        </p>
        <EuiLink
          href={router.link('/{key}/management/{tab}', {
            path: {
              key: 'logs',
              tab: 'significantEvents',
            },
          })}
          data-test-subj="significant_events_summary_go_to_tab"
        >
          {i18n.translate('xpack.streams.significantEventsSummary.rootStreamLinkLabel', {
            defaultMessage: 'Create Significant event queries',
          })}
        </EuiLink>
      </EuiCallOut>
    );
  }

  return <Occurrences />;
}
