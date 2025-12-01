/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';

export function NoQueriesState() {
  const router = useStreamsAppRouter();

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
