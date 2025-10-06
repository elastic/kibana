/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import type { StreamQueryKql, Streams, System } from '@kbn/streams-schema';
import { useTimefilter } from '../../hooks/use_timefilter';
import { useSignificantEventsApi } from '../../hooks/use_significant_events_api';
import { useKibana } from '../../hooks/use_kibana';
import { AddSignificantEventFlyout } from './add_significant_event_flyout/add_significant_event_flyout';
import type { Flow, SaveData } from './add_significant_event_flyout/types';
import { getStreamTypeFromDefinition } from '../../util/get_stream_type_from_definition';

export const EditSignificantEventFlyout = ({
  queryToEdit,
  definition,
  isEditFlyoutOpen,
  setIsEditFlyoutOpen,
  initialFlow,
  selectedSystems,
  setSelectedSystems,
  setQueryToEdit,
  systems,
  refresh,
}: {
  refresh: () => void;
  setQueryToEdit: React.Dispatch<React.SetStateAction<StreamQueryKql | undefined>>;
  initialFlow?: Flow;
  selectedSystems: System[];
  setSelectedSystems: React.Dispatch<React.SetStateAction<System[]>>;
  systems: System[];
  queryToEdit?: StreamQueryKql;
  definition: Streams.all.GetResponse;
  isEditFlyoutOpen: boolean;
  setIsEditFlyoutOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const {
    core: { notifications },
    services: { telemetryClient },
  } = useKibana();
  const {
    timeState: { start, end },
  } = useTimefilter();

  const { upsertQuery, bulk } = useSignificantEventsApi({
    name: definition.stream.name,
    start,
    end,
  });

  return isEditFlyoutOpen ? (
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
                refresh();
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
                refresh();
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
      systems={systems}
    />
  ) : null;
};
