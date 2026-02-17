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
import type { StreamQueryKql, Streams, System } from '@kbn/streams-schema';
import { compact, isEqual } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import {
  OPEN_SIGNIFICANT_EVENTS_FLYOUT_URL_PARAM,
  SELECTED_SYSTEMS_URL_PARAM,
} from '../../constants';
import { useAIFeatures } from '../../hooks/use_ai_features';
import { useFetchSignificantEvents } from '../../hooks/use_fetch_significant_events';
import { useKibana } from '../../hooks/use_kibana';
import { useSignificantEventsApi } from '../../hooks/use_significant_events_api';
import { useTimeRange } from '../../hooks/use_time_range';
import { useTimeRangeUpdate } from '../../hooks/use_time_range_update';
import { useTimefilter } from '../../hooks/use_timefilter';
import { LoadingPanel } from '../loading_panel';
import { useStreamSystems } from '../stream_detail_systems/stream_systems/hooks/use_stream_systems';
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

  const { systems, refreshSystems, systemsLoading } = useStreamSystems(definition.stream.name);
  const [query, setQuery] = useState<string>('');
  const significantEventsFetchState = useFetchSignificantEvents({
    name: definition.stream.name,
    query,
  });

  const { removeQuery } = useSignificantEventsApi({ name: definition.stream.name });
  const [isEditFlyoutOpen, setIsEditFlyoutOpen] = useState(false);
  const [initialFlow, setInitialFlow] = useState<Flow | undefined>('ai');

  const [selectedSystems, setSelectedSystems] = useState<System[]>([]);
  const [queryToEdit, setQueryToEdit] = useState<StreamQueryKql | undefined>();
  const [dateRange, setDateRange] = useState<TimeRange>({ from: rangeFrom, to: rangeTo });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get(OPEN_SIGNIFICANT_EVENTS_FLYOUT_URL_PARAM) === 'true' && systems.length > 0) {
      setIsEditFlyoutOpen(true);

      // Parse selected systems from URL parameters
      const selectedSystemsParam = urlParams.get(SELECTED_SYSTEMS_URL_PARAM);

      if (selectedSystemsParam) {
        const selectedSystemNames = selectedSystemsParam.split(',').filter((name) => name.trim());
        setSelectedSystems(systems.filter((system) => selectedSystemNames.includes(system.name)));
      }

      // Clean up the URL parameters after opening the flyout
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete(OPEN_SIGNIFICANT_EVENTS_FLYOUT_URL_PARAM);
      newUrl.searchParams.delete(SELECTED_SYSTEMS_URL_PARAM);
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [systems]);

  if (
    !significantEventsFetchState.data &&
    (systemsLoading || significantEventsFetchState.isLoading)
  ) {
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
      selectedSystems={selectedSystems}
      setSelectedSystems={setSelectedSystems}
      systems={systems}
      refreshSystems={refreshSystems}
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
          systems={systems}
          selectedSystems={selectedSystems}
          onSystemsChange={setSelectedSystems}
          definition={definition.stream}
          refreshSystems={refreshSystems}
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
                  setSelectedSystems([]);
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
      {editFlyout(selectedSystems.length > 0)}
    </>
  );
}
