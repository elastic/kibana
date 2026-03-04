/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { niceTimeFormatter } from '@elastic/charts';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import type { TimeRange } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import type { StreamQuery, Streams } from '@kbn/streams-schema';
import { compact, isEqual } from 'lodash';
import React, { useMemo, useState } from 'react';
import { useAIFeatures } from '../../hooks/use_ai_features';
import { useFetchSignificantEvents } from '../../hooks/use_fetch_significant_events';
import { useKibana } from '../../hooks/use_kibana';
import { useSignificantEventsApi } from '../../hooks/use_significant_events_api';
import { useTimeRange } from '../../hooks/use_time_range';
import { useTimeRangeUpdate } from '../../hooks/use_time_range_update';
import { useTimefilter } from '../../hooks/use_timefilter';
import { LoadingPanel } from '../loading_panel';
import { EditSignificantEventFlyout } from './add_significant_event_flyout/edit_significant_event_flyout';
import type { Flow } from './add_significant_event_flyout/types';
import { EmptyState } from './empty_state';
import { SignificantEventsHistogramChart } from './significant_events_histogram';
import { SignificantEventsTable } from './significant_events_table';
import { formatChangePoint } from './utils/change_point';

interface Props {
  definition: Streams.all.GetResponse;
}

export function StreamDetailSignificantEventsView({ definition }: Props) {
  const { rangeFrom, rangeTo, startMs, endMs } = useTimeRange();
  const { updateTimeRange } = useTimeRangeUpdate();
  const { refresh } = useTimefilter();
  const {
    dependencies: {
      start: { unifiedSearch },
    },
  } = useKibana();
  const { euiTheme } = useEuiTheme();
  const aiFeatures = useAIFeatures();

  const xFormatter = useMemo(() => {
    return niceTimeFormatter([startMs, endMs]);
  }, [startMs, endMs]);

  const [query, setQuery] = useState<string>('');
  // Only show rule-backed queries in the stream detail view; the discovery page shows all queries.
  const significantEventsFetchState = useFetchSignificantEvents({
    name: definition.stream.name,
    query,
    ruleBacked: true,
  });

  const { removeQuery } = useSignificantEventsApi({ name: definition.stream.name });
  const [isEditFlyoutOpen, setIsEditFlyoutOpen] = useState(false);
  const [initialFlow, setInitialFlow] = useState<Flow | undefined>('ai');

  const [queryToEdit, setQueryToEdit] = useState<StreamQuery | undefined>();
  const [dateRange, setDateRange] = useState<TimeRange>({ from: rangeFrom, to: rangeTo });

  if (!significantEventsFetchState.data && significantEventsFetchState.isLoading) {
    return <LoadingPanel size="xxl" />;
  }

  const editFlyout = (generateOnMount: boolean) => (
    <EditSignificantEventFlyout
      setIsEditFlyoutOpen={setIsEditFlyoutOpen}
      isEditFlyoutOpen={isEditFlyoutOpen}
      definition={definition}
      refresh={significantEventsFetchState.refetch}
      queryToEdit={queryToEdit}
      setQueryToEdit={setQueryToEdit}
      initialFlow={initialFlow}
      generateOnMount={generateOnMount}
      aiFeatures={aiFeatures}
    />
  );

  const noSignificantEvents =
    !query &&
    !significantEventsFetchState.isLoading &&
    significantEventsFetchState.data &&
    significantEventsFetchState.data.significant_events.length === 0;

  if (noSignificantEvents) {
    return (
      <>
        <EmptyState
          onManualEntryClick={() => {
            setQueryToEdit(undefined);
            setInitialFlow('manual');
            setIsEditFlyoutOpen(true);
          }}
          onGenerateSuggestionsClick={() => {
            setInitialFlow('ai');
            setIsEditFlyoutOpen(true);
          }}
          aiFeatures={aiFeatures}
        />
        {editFlyout(true)}
      </>
    );
  }

  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="row" gutterSize="s">
            <EuiFlexItem grow>
              <unifiedSearch.ui.SearchBar
                appName="streamsApp"
                showFilterBar={false}
                showQueryMenu={false}
                showQueryInput={true}
                submitButtonStyle="iconOnly"
                displayStyle="inPage"
                disableQueryLanguageSwitcher
                onQuerySubmit={(queryN) => {
                  setQuery(String(queryN.query?.query ?? ''));

                  if (isEqual(queryN.dateRange, dateRange)) {
                    refresh();
                  } else if (queryN.dateRange) {
                    updateTimeRange(queryN.dateRange);
                    setDateRange(queryN.dateRange);
                  }
                }}
                query={{
                  query,
                  language: 'text',
                }}
                isLoading={significantEventsFetchState.isLoading}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill={true}
                size="s"
                color="primary"
                onClick={() => {
                  setIsEditFlyoutOpen(true);
                  setQueryToEdit(undefined);
                }}
                iconType="plus"
                data-test-subj="significant_events_existing_queries_open_flyout_button"
              >
                {i18n.translate('xpack.streams.significantEvents.addSignificantEventButton', {
                  defaultMessage: 'Significant events',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiPanel grow={false} hasShadow={false} hasBorder={true}>
          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiText css={{ fontWeight: euiTheme.font.weight.semiBold }}>
                {i18n.translate(
                  'xpack.streams.addSignificantEventFlyout.manualFlow.previewChartDetectedOccurrences',
                  {
                    defaultMessage: 'Detected event occurrences ({count})',
                    values: {
                      count: (
                        significantEventsFetchState.data?.aggregated_occurrences ?? []
                      ).reduce((acc, point) => acc + point.y, 0),
                    },
                  }
                )}
              </EuiText>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <SignificantEventsHistogramChart
                id={'all-events'}
                occurrences={significantEventsFetchState.data?.aggregated_occurrences ?? []}
                changes={compact(
                  (significantEventsFetchState.data?.significant_events ?? []).map((item) =>
                    formatChangePoint({
                      query: item.query,
                      change_points: item.change_points,
                      occurrences: item.occurrences,
                    })
                  )
                )}
                xFormatter={xFormatter}
                compressed={false}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>

        <EuiFlexItem grow={false}>
          <SignificantEventsTable
            loading={significantEventsFetchState.isLoading}
            definition={definition.stream}
            items={significantEventsFetchState.data?.significant_events ?? []}
            onEditClick={(item) => {
              setIsEditFlyoutOpen(true);
              setQueryToEdit({ ...item.query });
            }}
            onDeleteClick={async (item) => {
              await removeQuery?.(item.query.id).then(() => {
                significantEventsFetchState.refetch();
              });
            }}
            xFormatter={xFormatter}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {editFlyout(false)}
    </>
  );
}
