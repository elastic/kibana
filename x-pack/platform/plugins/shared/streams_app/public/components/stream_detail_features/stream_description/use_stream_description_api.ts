/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { Streams } from '@kbn/streams-schema';
import { omit } from 'lodash';
import { i18n } from '@kbn/i18n';
import { useAbortController } from '@kbn/react-hooks';
import { useAIFeatures } from '../../stream_detail_significant_events_view/add_significant_event_flyout/generated_flow_form/use_ai_features';
import { getFormattedError } from '../../../util/errors';
import { useUpdateStreams } from '../../../hooks/use_update_streams';
import { useKibana } from '../../../hooks/use_kibana';
import { useTimefilter } from '../../../hooks/use_timefilter';

export const useStreamDescriptionApi = ({
  definition,
  refreshDefinition,
}: {
  definition: Streams.all.GetResponse;
  refreshDefinition: () => void;
}) => {
  const { signal } = useAbortController();

  const updateStream = useUpdateStreams(definition.stream.name);
  const aiFeatures = useAIFeatures();

  const {
    core: { notifications },
    dependencies: {
      start: { streams },
    },
  } = useKibana();

  const { timeState } = useTimefilter();

  const [description, setDescription] = useState(definition.stream.description || '');

  const [isGenerating, setIsGenerating] = useState(false);

  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  // Save the updated description; show success and error toasts
  const save = useCallback(
    async (nextDescription: string) => {
      setIsUpdating(true);
      updateStream(
        Streams.all.UpsertRequest.parse({
          dashboards: definition.dashboards,
          queries: definition.queries,
          rules: definition.rules,
          stream: {
            ...omit(definition.stream, 'name'),
            description: nextDescription,
          },
        })
      )
        .then(() => {
          notifications.toasts.addSuccess({
            title: i18n.translate(
              'xpack.streams.streamDetailView.streamDescription.saveSuccessTitle',
              {
                defaultMessage: 'Description saved',
              }
            ),
          });
        })
        .catch((error) => {
          notifications.toasts.addError(error, {
            title: i18n.translate(
              'xpack.streams.streamDetailView.streamDescription.saveErrorTitle',
              {
                defaultMessage: 'Failed to save description',
              }
            ),
            toastMessage: getFormattedError(error).message,
          });
        })
        .finally(() => {
          setIsUpdating(false);
          refreshDefinition();
        });
    },
    [
      updateStream,
      definition.dashboards,
      definition.queries,
      definition.rules,
      definition.stream,
      notifications.toasts,
      refreshDefinition,
    ]
  );

  const generate = useCallback(() => {
    if (!aiFeatures?.genAiConnectors.selectedConnector) {
      return;
    }

    setIsGenerating(true);

    streams.streamsRepositoryClient
      .stream('POST /internal/streams/{name}/_describe_stream', {
        signal,
        params: {
          path: {
            name: definition.stream.name,
          },
          query: {
            connectorId: aiFeatures.genAiConnectors.selectedConnector,
            from: timeState.asAbsoluteTimeRange.from,
            to: timeState.asAbsoluteTimeRange.to,
          },
        },
      })
      .subscribe({
        next({ description: generatedDescription }) {
          setDescription(generatedDescription);
        },
        complete() {
          setIsGenerating(false);
        },
        error(error) {
          setIsGenerating(false);
          notifications.toasts.addError(error, {
            title: i18n.translate(
              'xpack.streams.streamDetailView.streamDescription.generateErrorTitle',
              { defaultMessage: 'Failed to generate description' }
            ),
            toastMessage: getFormattedError(error).message,
          });
        },
      });
  }, [
    definition.stream.name,
    streams.streamsRepositoryClient,
    timeState.asAbsoluteTimeRange.from,
    timeState.asAbsoluteTimeRange.to,
    aiFeatures?.genAiConnectors.selectedConnector,
    signal,
    notifications.toasts,
  ]);

  const onCancelEdit = useCallback(() => {
    setDescription(definition.stream.description);
    setIsEditing(false);
  }, [setIsEditing, setDescription, definition.stream.description]);

  const onGenerateDescription = useCallback(() => {
    generate();
    setIsEditing(true);
  }, [generate, setIsEditing]);

  const onStartEditing = useCallback(() => {
    setIsEditing(true);
  }, [setIsEditing]);

  const onSaveDescription = useCallback(() => {
    if (description !== definition.stream.description) {
      save(description);
    }
    setIsEditing(false);
  }, [description, definition.stream.description, save, setIsEditing]);

  const areButtonsDisabled = isUpdating || isGenerating;

  return {
    description,
    setDescription,
    isGenerating,
    isUpdating,
    isEditing,
    areButtonsDisabled,
    onCancelEdit,
    onGenerateDescription,
    onStartEditing,
    onSaveDescription,
  };
};
