/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { niceTimeFormatter } from '@elastic/charts';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { StreamQueryKql } from '@kbn/streams-schema';
import type { Streams } from '@kbn/streams-schema';
import React, { useMemo, useState } from 'react';
import { PreviewDataSparkPlot } from './add_significant_event_flyout/common/preview_data_spark_plot';
import { useFetchSignificantEvents } from '../../hooks/use_fetch_significant_events';
import { useKibana } from '../../hooks/use_kibana';
import { useSignificantEventsApi } from '../../hooks/use_significant_events_api';
import { useTimefilter } from '../../hooks/use_timefilter';
import { LoadingPanel } from '../loading_panel';
import { StreamsAppSearchBar } from '../streams_app_search_bar';
import { AddSignificantEventFlyout } from './add_significant_event_flyout/add_significant_event_flyout';
import type { SaveData } from './add_significant_event_flyout/types';
import { SignificantEventsViewEmptyState } from './empty_state/empty_state';
import { SignificantEventsTable } from './significant_events_table';
import { getStreamTypeFromDefinition } from '../../util/get_stream_type_from_definition';
import { NO_SYSTEM } from './add_significant_event_flyout/utils/default_query';

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

  const xFormatter = useMemo(() => {
    return niceTimeFormatter([start, end]);
  }, [start, end]);

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

  const [queryToEdit, setQueryToEdit] = useState<StreamQueryKql | undefined>();

  if (!significantEventsFetchState.value) {
    return <LoadingPanel />;
  }

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
      }}
    />
  ) : null;

  if (significantEventsFetchState.value.length === 0) {
    return (
      <>
        <SignificantEventsViewEmptyState
          onAddClick={() => {
            setIsEditFlyoutOpen(true);
            setQueryToEdit(undefined);
          }}
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
              <StreamsAppSearchBar
                showQueryInput
                showDatePicker
                onQuerySubmit={() => {}}
                query={{
                  query: '',
                  language: 'text',
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
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
            query={{ kql: { query: '*' }, id: 'preview_all', title: 'All events' }}
            isQueryValid={true}
            noOfBuckets={50}
          />
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
