/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiBasicTable, EuiLink, EuiTableFieldDataColumnType } from '@elastic/eui';
import { IngestStreamGetResponse, SignificantEventsResponse } from '@kbn/streams-schema';
import React from 'react';
import { useFetchSignificantEvents } from '../../hooks/use_fetch_significant_events';
import { useKibana } from '../../hooks/use_kibana';
import { SignificantEventsHistogramChart } from './significant_events_histogram';
import { buildDiscoverParams } from './utils/discover_helpers';

export function StreamDetailSignificantEventsView({
  definition,
}: {
  definition?: IngestStreamGetResponse;
}) {
  const {
    dependencies: {
      start: { discover },
    },
  } = useKibana();
  const { isLoading, data } = useFetchSignificantEvents(definition?.stream.name);

  const columns: Array<EuiTableFieldDataColumnType<SignificantEventsResponse>> = [
    {
      field: 'title',
      name: 'Event name',
      render: (_, record: SignificantEventsResponse) => (
        <EuiLink
          target="_blank"
          href={discover?.locator?.getRedirectUrl(
            buildDiscoverParams(record, definition?.stream.name)
          )}
        >
          {record.title}
        </EuiLink>
      ),
    },
    {
      field: 'query',
      name: 'Query',
      render: (_, record: SignificantEventsResponse) => <>{record.kql.query}</>,
    },
    {
      field: 'occurrences',
      name: 'Occurrences',
      render: (_, record: SignificantEventsResponse) => (
        <SignificantEventsHistogramChart occurrences={record.occurrences} />
      ),
    },
  ];

  return (
    <EuiBasicTable
      tableCaption="Significant Events"
      items={data ?? []}
      rowHeader="title"
      columns={columns}
      loading={isLoading}
    />
  );
}
