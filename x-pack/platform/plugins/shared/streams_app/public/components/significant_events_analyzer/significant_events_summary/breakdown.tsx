/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiListGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { AbortableAsyncState } from '@kbn/react-hooks';
import type { ListOccurrencesResponse } from '@kbn/streams-plugin/server/routes/internal/streams/significant_events/route';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';

export function Breakdown({
  occurrencesFetch,
}: {
  occurrencesFetch: AbortableAsyncState<Promise<ListOccurrencesResponse>>;
}) {
  const router = useStreamsAppRouter();

  if (occurrencesFetch.value === undefined) {
    return null;
  }

  const streamLinks = Object.entries(occurrencesFetch.value.by_stream).map(
    ([streamName, count]) => ({
      label: i18n.translate(
        'xpack.streams.significantEventsSummary.occurrencesFoundPerStreamLabel',
        {
          defaultMessage:
            '{streamName} ({occurrences, plural, one {# event} other {# events}} from {queries, plural, one {# query} other {# queries}})',
          values: {
            streamName,
            occurrences: count.occurrences,
            queries: count.queries,
          },
        }
      ),
      href: router.link('/{key}/management/{tab}', {
        path: {
          key: streamName,
          tab: 'significantEvents',
        },
      }),
    })
  );

  return (
    <EuiAccordion
      id="significant_events_summary_stream_breakdown"
      buttonContent={i18n.translate(
        'xpack.streams.significantEventsSummary.occurrencesBreakdownToggleLabel',
        {
          defaultMessage:
            '{total_occurrences, plural, one {# event} other {# events}} found across {total_streams, plural, one {# stream} other {# streams}} using {total_queries, plural, one {# query} other {# queries}}',
          values: {
            total_occurrences: occurrencesFetch.value.total_occurrences,
            total_streams: occurrencesFetch.value.total_streams,
            total_queries: occurrencesFetch.value.total_queries,
          },
        }
      )}
    >
      <EuiListGroup
        listItems={streamLinks}
        color="primary"
        gutterSize="none"
        data-test-subj="significant_events_summary_stream_links"
      />
    </EuiAccordion>
  );
}
