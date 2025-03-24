/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { IngestStreamGetResponse, StreamQueryKql } from '@kbn/streams-schema';
import React, { useMemo, useState } from 'react';
import { niceTimeFormatter } from '@elastic/charts';
import { useFetchSignificantEvents } from '../../hooks/use_fetch_significant_events';
import { useKibana } from '../../hooks/use_kibana';
import { StreamsAppSearchBar } from '../streams_app_search_bar';
import { SignificantEventsTable } from './significant_events_table';
import { SignificantEventFlyout } from './significant_event_flyout';
import { Timeline, TimelineEvent } from '../timeline';
import { formatChangePoint } from './change_point';
import { ChangePointSummary } from './change_point_summary';

export function StreamDetailSignificantEventsView({
  definition,
}: {
  definition?: IngestStreamGetResponse;
}) {
  const {
    dependencies: {
      start: { data },
    },
  } = useKibana();

  const {
    timeRange,
    setTimeRange,
    absoluteTimeRange: { start, end },
  } = data.query.timefilter.timefilter.useTimefilter();

  const theme = useEuiTheme().euiTheme;

  const xFormatter = useMemo(() => {
    return niceTimeFormatter([start, end]);
  }, [start, end]);

  const significantEventsFetchState = useFetchSignificantEvents({
    name: definition?.stream.name,
    start,
    end,
  });

  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

  const [queryToEdit, setQueryToEdit] = useState<StreamQueryKql | undefined>();

  const events = useMemo(() => {
    return (
      significantEventsFetchState.value?.flatMap((item): TimelineEvent[] => {
        const change = formatChangePoint(item);

        if (!change) {
          return [];
        }

        return [
          {
            id: item.query.id,
            label: <ChangePointSummary change={change} xFormatter={xFormatter} />,
            color: theme.colors[change.color],
            time: change.time,
          },
        ];
      }) ?? []
    );
  }, [significantEventsFetchState.value, theme, xFormatter]);

  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="row" alignItems="flexStart" justifyContent="flexEnd">
            <StreamsAppSearchBar
              onQuerySubmit={({ dateRange }, isUpdate) => {
                if (!isUpdate) {
                  significantEventsFetchState.refresh();
                  return;
                }

                if (dateRange) {
                  setTimeRange({ from: dateRange.from, to: dateRange?.to, mode: dateRange.mode });
                }
              }}
              onRefresh={() => {
                significantEventsFetchState.refresh();
              }}
              dateRangeFrom={timeRange.from}
              dateRangeTo={timeRange.to}
            />
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <Timeline start={start} end={end} events={events} />
        </EuiFlexItem>

        <EuiSpacer />

        <EuiFlexItem grow={false}>
          <SignificantEventsTable
            name={definition?.stream.name}
            response={significantEventsFetchState}
            onEditClick={(item) => {
              setIsFlyoutOpen(true);
              setQueryToEdit(item.query);
            }}
            onDeleteClick={() => {}}
            xFormatter={xFormatter}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {isFlyoutOpen ? (
        <SignificantEventFlyout
          onClose={() => {
            setIsFlyoutOpen(false);
            setQueryToEdit(undefined);
          }}
          query={queryToEdit}
          indexPattern={definition?.stream.name ?? ''}
        />
      ) : null}
    </>
  );
}
