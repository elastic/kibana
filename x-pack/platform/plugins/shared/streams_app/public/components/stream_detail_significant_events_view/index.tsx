/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { niceTimeFormatter } from '@elastic/charts';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { StreamQueryKql, System } from '@kbn/streams-schema';
import type { Streams } from '@kbn/streams-schema';
import React, { useMemo, useState } from 'react';
import { useFilteredSigEvents } from './hooks/use_filtered_sig_events';
import { useKibana } from '../../hooks/use_kibana';
import { EditSignificantEventFlyout } from './edit_significant_event_flyout';
import { PreviewDataSparkPlot } from './add_significant_event_flyout/common/preview_data_spark_plot';
import { useFetchSignificantEvents } from '../../hooks/use_fetch_significant_events';
import { useSignificantEventsApi } from '../../hooks/use_significant_events_api';
import { useTimefilter } from '../../hooks/use_timefilter';
import { LoadingPanel } from '../loading_panel';
import type { Flow } from './add_significant_event_flyout/types';
import { NoSignificantEventsEmptyState } from './empty_state/empty_state';
import { SignificantEventsTable } from './significant_events_table';
import { NO_SYSTEM } from './add_significant_event_flyout/utils/default_query';
import { NoSystemsEmptyState } from './empty_state/no_systems';
import { StreamSystemsFlyout } from '../data_management/stream_detail_management/stream_systems/stream_systems_flyout';
import { useStreamSystems } from '../data_management/stream_detail_management/stream_systems/hooks/use_stream_systems';
import { useStreamSystemsApi } from '../../hooks/use_stream_systems_api';
import { useAIFeatures } from './add_significant_event_flyout/generated_flow_form/use_ai_features';

interface Props {
  definition: Streams.all.GetResponse;
}

export function StreamDetailSignificantEventsView({ definition }: Props) {
  const {
    timeState: { start, end },
    setTime,
  } = useTimefilter();
  const { unifiedSearch } = useKibana().dependencies.start;

  const aiFeatures = useAIFeatures();

  const xFormatter = useMemo(() => {
    return niceTimeFormatter([start, end]);
  }, [start, end]);

  const { systems, refresh, loading: systemsLoading } = useStreamSystems(definition.stream);
  const { identifySystems } = useStreamSystemsApi(definition.stream);
  const [isSystemDetectionFlyoutOpen, setIsSystemDetectionFlyoutOpen] = useState(false);
  const [isSystemDetectionLoading, setIsSystemDetectionLoading] = useState(false);
  const [detectedSystems, setDetectedSystems] = useState<System[]>([]);

  const significantEventsFetchState = useFetchSignificantEvents({
    name: definition.stream.name,
    start,
    end,
  });

  const { removeQuery } = useSignificantEventsApi({
    name: definition.stream.name,
    start,
    end,
  });
  const [isEditFlyoutOpen, setIsEditFlyoutOpen] = useState(false);
  const [initialFlow, setInitialFlow] = useState<Flow | undefined>('ai');

  const [selectedSystems, setSelectedSystems] = useState<System[]>([]);
  const [queryToEdit, setQueryToEdit] = useState<StreamQueryKql | undefined>();

  const [query, setQuery] = useState<string>('');

  const { significantEvents, combinedQuery } = useFilteredSigEvents(
    significantEventsFetchState.value ?? [],
    query
  );

  if (systemsLoading || significantEventsFetchState.loading) {
    return <LoadingPanel size="xxl" />;
  }

  const systemDetectionFlyout = isSystemDetectionFlyoutOpen ? (
    <StreamSystemsFlyout
      definition={definition.stream}
      systems={detectedSystems}
      isLoading={isSystemDetectionLoading}
      closeFlyout={() => {
        refresh();
        setIsSystemDetectionFlyoutOpen(false);
      }}
    />
  ) : null;

  const editFlyout = (
    <EditSignificantEventFlyout
      setIsEditFlyoutOpen={setIsEditFlyoutOpen}
      isEditFlyoutOpen={isEditFlyoutOpen}
      definition={definition}
      refresh={significantEventsFetchState.refresh}
      queryToEdit={queryToEdit}
      setQueryToEdit={setQueryToEdit}
      initialFlow={initialFlow}
      selectedSystems={selectedSystems}
      setSelectedSystems={setSelectedSystems}
      systems={systems}
    />
  );

  const noSystems = systems.length === 0;
  const noSignificantEvents =
    significantEventsFetchState.value && significantEventsFetchState.value.length === 0;

  if (noSystems && noSignificantEvents) {
    return (
      <>
        <NoSystemsEmptyState
          onSystemDetectionClick={() => {
            setIsSystemDetectionLoading(true);
            setIsSystemDetectionFlyoutOpen(true);

            identifySystems(aiFeatures?.genAiConnectors.selectedConnector!, 'now', 'now-24h')
              .then((data) => {
                setDetectedSystems(data.systems);
              })
              .finally(() => {
                setIsSystemDetectionLoading(false);
              });
          }}
          onManualEntryClick={() => {
            setQueryToEdit(undefined);
            setInitialFlow('manual');
            setIsEditFlyoutOpen(true);
          }}
        />
        {systemDetectionFlyout}
        {editFlyout}
      </>
    );
  }

  if (noSignificantEvents) {
    return (
      <>
        <NoSignificantEventsEmptyState
          onGenerateSuggestionsClick={() => {
            setInitialFlow('ai');
            setIsEditFlyoutOpen(true);
          }}
          onManualEntryClick={() => {
            setQueryToEdit(undefined);
            setInitialFlow('manual');
            setIsEditFlyoutOpen(true);
          }}
          systems={systems}
          selectedSystems={selectedSystems}
          onSystemsChange={setSelectedSystems}
        />
        {editFlyout}
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
                onRefresh={(q) => {
                  significantEventsFetchState.refresh();
                  setTime(q.dateRange);
                }}
                onQuerySubmit={(queryN) => {
                  setQuery(String(queryN.query?.query ?? ''));
                  setTime(queryN.dateRange);
                }}
                onQueryChange={(queryN) => {
                  setQuery(String(queryN.query?.query ?? ''));
                  setTime(queryN.dateRange);
                }}
                query={{
                  query,
                  language: 'text',
                }}
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
              >
                {i18n.translate('xpack.streams.significantEvents.addSignificantEventButton', {
                  defaultMessage: 'Significant events',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <PreviewDataSparkPlot
            definition={definition.stream}
            query={{ kql: { query: combinedQuery ?? '' }, id: 'preview_all', title: 'All events' }}
            isQueryValid={true}
            noOfBuckets={50}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <SignificantEventsTable
            loading={significantEventsFetchState.loading}
            definition={definition.stream}
            items={significantEvents}
            onEditClick={(item) => {
              setIsEditFlyoutOpen(true);
              setQueryToEdit({
                ...item.query,
                system: item.query.system ?? NO_SYSTEM,
              });
            }}
            onDeleteClick={async (item) => {
              await removeQuery?.(item.query.id).then(() => {
                significantEventsFetchState.refresh();
              });
            }}
            xFormatter={xFormatter}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {editFlyout}
    </>
  );
}
