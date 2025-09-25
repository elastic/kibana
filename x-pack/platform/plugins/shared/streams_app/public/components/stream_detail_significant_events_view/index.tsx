/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { niceTimeFormatter } from '@elastic/charts';
import { EuiButton, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { StreamQueryKql, System } from '@kbn/streams-schema';
import type { Streams } from '@kbn/streams-schema';
import React, { useMemo, useState } from 'react';
import { useFetchSignificantEvents } from '../../hooks/use_fetch_significant_events';
import { useKibana } from '../../hooks/use_kibana';
import { useSignificantEventsApi } from '../../hooks/use_significant_events_api';
import { useTimefilter } from '../../hooks/use_timefilter';
import { LoadingPanel } from '../loading_panel';
import { StreamsAppSearchBar } from '../streams_app_search_bar';
import { AddSignificantEventFlyout } from './add_significant_event_flyout/add_significant_event_flyout';
import type { Flow, SaveData } from './add_significant_event_flyout/types';
import { ChangePointSummary } from './change_point_summary';
import { NoSignificantEventsEmptyState } from './empty_state/empty_state';
import { SignificantEventsTable } from './significant_events_table';
import type { TimelineEvent } from './timeline';
import { Timeline } from './timeline';
import { formatChangePoint } from './utils/change_point';
import { getStreamTypeFromDefinition } from '../../util/get_stream_type_from_definition';
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
    core: { notifications },
    services: { telemetryClient },
  } = useKibana();
  const {
    timeState: { start, end },
  } = useTimefilter();
  const aiFeatures = useAIFeatures();

  const theme = useEuiTheme().euiTheme;

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
  const { upsertQuery, removeQuery, bulk } = useSignificantEventsApi({
    name: definition.stream.name,
    start,
    end,
  });
  const [isEditFlyoutOpen, setIsEditFlyoutOpen] = useState(false);
  const [initialFlow, setInitialFlow] = useState<Flow | undefined>(undefined);

  const [selectedSystems, setSelectedSystems] = useState<System[]>([]);
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
            header: item.query.title,
          },
        ];
      }) ?? []
    );
  }, [significantEventsFetchState.value, theme, xFormatter]);

  if (systemsLoading || significantEventsFetchState.loading) {
    return <LoadingPanel />;
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

  const editFlyout = isEditFlyoutOpen ? (
    <AddSignificantEventFlyout
      definition={definition.stream}
      query={queryToEdit}
      onSave={async (data: SaveData) => {
        const streamType = getStreamTypeFromDefinition(definition.stream);

        switch (data.type) {
          case 'single':
            await upsertQuery(data.query).then(
              () => {
                notifications.toasts.addSuccess({
                  title: i18n.translate(
                    'xpack.streams.significantEvents.savedSingle.successfullyToastTitle',
                    { defaultMessage: `Saved significant event query successfully` }
                  ),
                });
                telemetryClient.trackSignificantEventsCreated({
                  count: 1,
                  stream_type: streamType,
                });
                setIsEditFlyoutOpen(false);
                significantEventsFetchState.refresh();
              },
              (error) => {
                notifications.showErrorDialog({
                  title: i18n.translate(
                    'xpack.streams.significantEvents.savedSingle.errorToastTitle',
                    { defaultMessage: `Could not save significant event query` }
                  ),
                  error,
                });
              }
            );
            break;
          case 'multiple':
            await bulk(data.queries.map((query) => ({ index: query }))).then(
              () => {
                notifications.toasts.addSuccess({
                  title: i18n.translate(
                    'xpack.streams.significantEvents.savedMultiple.successfullyToastTitle',
                    { defaultMessage: `Saved significant events queries successfully` }
                  ),
                });
                telemetryClient.trackSignificantEventsCreated({
                  count: data.queries.length,
                  stream_type: streamType,
                });
                setIsEditFlyoutOpen(false);
                significantEventsFetchState.refresh();
              },
              (error) => {
                notifications.showErrorDialog({
                  title: i18n.translate(
                    'xpack.streams.significantEvents.savedMultiple.errorToastTitle',
                    { defaultMessage: 'Could not save significant events queries' }
                  ),
                  error,
                });
              }
            );
            break;
        }
      }}
      onClose={() => {
        setIsEditFlyoutOpen(false);
        setQueryToEdit(undefined);
        setSelectedSystems([]);
      }}
      initialFlow={initialFlow}
      initialSelectedSystems={selectedSystems}
      systems={systems.map((system) => ({
        name: system.name,
        filter: system.filter,
      }))}
    />
  ) : null;

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
              <StreamsAppSearchBar showQueryInput={false} showDatePicker />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
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
          <Timeline start={start} end={end} events={events} xFormatter={xFormatter} />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <SignificantEventsTable
            definition={definition.stream}
            response={significantEventsFetchState}
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
