/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiBadge,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSuperDatePicker,
  EuiTableFieldDataColumnType,
  OnTimeChangeProps,
} from '@elastic/eui';
import { IngestStreamGetResponse, SignificantEventsResponse } from '@kbn/streams-schema';
import React, { useState } from 'react';
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
  const [range, setRange] = useState({ from: 'now-1d', to: 'now' });
  const { isLoading, data: significantEvents } = useFetchSignificantEvents({
    name: definition?.stream.name,
    range,
  });

  const onTimeChange = ({ start, end }: OnTimeChangeProps) => {
    setRange({ from: start, to: end });
  };

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
    {
      field: 'change_points',
      name: 'Change points',
      render: (_, record: SignificantEventsResponse) => (
        <EuiBadge>
          {Object.keys(record.change_points.type)[0]} -{' '}
          {Object.values(record.change_points.type)[0]?.p_value ?? 0}
        </EuiBadge>
      ),
    },
  ];

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="row" alignItems="flexStart" justifyContent="flexEnd">
          <EuiSuperDatePicker
            isLoading={isLoading}
            start={range.from}
            end={range.to}
            onTimeChange={onTimeChange}
            showUpdateButton
          />
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiBasicTable
          tableCaption="Significant Events"
          items={significantEvents ?? []}
          rowHeader="title"
          columns={columns}
          loading={isLoading}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
