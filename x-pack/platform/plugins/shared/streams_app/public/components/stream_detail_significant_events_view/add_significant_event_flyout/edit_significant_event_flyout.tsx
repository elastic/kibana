/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import type { StreamQuery, Streams } from '@kbn/streams-schema';
import { useSignificantEventsApi } from '../../../hooks/use_significant_events_api';
import { useOnboardingApi } from '../../../hooks/use_onboarding_api';
import { useKibana } from '../../../hooks/use_kibana';
import type { AIFeatures } from '../../../hooks/use_ai_features';
import { AddSignificantEventFlyout } from './add_significant_event_flyout';
import type { Flow, SaveData } from './types';
import { getStreamTypeFromDefinition } from '../../../util/get_stream_type_from_definition';

export const EditSignificantEventFlyout = ({
  queryToEdit,
  definition,
  isEditFlyoutOpen,
  setIsEditFlyoutOpen,
  initialFlow,
  setQueryToEdit,
  refresh,
  generateOnMount,
  aiFeatures,
}: {
  refresh: () => void;
  setQueryToEdit: React.Dispatch<React.SetStateAction<StreamQuery | undefined>>;
  initialFlow?: Flow;
  queryToEdit?: StreamQuery;
  definition: Streams.all.GetResponse;
  isEditFlyoutOpen: boolean;
  setIsEditFlyoutOpen: React.Dispatch<React.SetStateAction<boolean>>;
  generateOnMount: boolean;
  aiFeatures: AIFeatures | null;
}) => {
  const {
    core: { notifications },
    services: { telemetryClient },
  } = useKibana();

  const { upsertQuery, bulk } = useSignificantEventsApi({
    name: definition.stream.name,
  });

  const { acknowledgeOnboardingTask } = useOnboardingApi({
    connectorId: aiFeatures?.genAiConnectors.selectedConnector,
    saveQueries: false,
  });

  const onCloseFlyout = () => {
    setIsEditFlyoutOpen(false);
    setQueryToEdit(undefined);
  };

  return isEditFlyoutOpen ? (
    <AddSignificantEventFlyout
      generateOnMount={generateOnMount}
      definition={definition}
      query={queryToEdit}
      aiFeatures={aiFeatures}
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

                onCloseFlyout();
                refresh();

                telemetryClient.trackSignificantEventsCreated({
                  count: 1,
                  stream_name: definition.stream.name,
                  stream_type: streamType,
                });
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
            await bulk(
              data.queries.map((bulkQuery) => ({
                index: bulkQuery,
              }))
            ).then(
              async () => {
                // Acknowledge the task after successful save
                await acknowledgeOnboardingTask(definition.stream.name).catch(() => {
                  // Ignore errors - task acknowledgment is not critical
                });

                notifications.toasts.addSuccess({
                  title: i18n.translate(
                    'xpack.streams.significantEvents.savedMultiple.successfullyToastTitle',
                    { defaultMessage: `Saved significant events queries successfully` }
                  ),
                });

                onCloseFlyout();
                refresh();

                telemetryClient.trackSignificantEventsCreated({
                  count: data.queries.length,
                  stream_name: definition.stream.name,
                  stream_type: streamType,
                });
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
      onClose={onCloseFlyout}
      initialFlow={initialFlow}
    />
  ) : null;
};
