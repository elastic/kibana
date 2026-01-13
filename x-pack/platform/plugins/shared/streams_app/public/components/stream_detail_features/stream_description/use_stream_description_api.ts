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
import { firstValueFrom } from 'rxjs';
import { getStreamTypeFromDefinition } from '../../../util/get_stream_type_from_definition';
import { getLast24HoursTimeRange } from '../../../util/time_range';
import type { AIFeatures } from '../../../hooks/use_ai_features';
import { getFormattedError } from '../../../util/errors';
import { useUpdateStreams } from '../../../hooks/use_update_streams';
import { useKibana } from '../../../hooks/use_kibana';

export const useStreamDescriptionApi = ({
  definition,
  refreshDefinition,
  aiFeatures,
  silent = false,
}: {
  definition: Streams.all.GetResponse;
  refreshDefinition: () => void;
  aiFeatures: AIFeatures | null;
  silent?: boolean;
}) => {
  const { signal, abort: abortController, refresh } = useAbortController();

  const abort = useCallback(() => {
    abortController();
    refresh();
  }, [abortController, refresh]);

  const updateStream = useUpdateStreams(definition.stream.name);

  const {
    core: { notifications },
    dependencies: {
      start: { streams },
    },
    services: { telemetryClient },
  } = useKibana();

  const [description, setDescription] = useState(definition.stream.description || '');

  const [isGenerating, setIsGenerating] = useState(false);

  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  // Save the updated description; show success and error toasts unless silent
  const save = useCallback(
    async (nextDescription: string) => {
      setIsUpdating(true);

      let stream;
      if (Streams.GroupStream.Definition.is(definition.stream)) {
        stream = omit(definition.stream, ['name', 'updated_at']);
      } else {
        stream = {
          ...omit(definition.stream, ['name', 'updated_at']),
          ingest: {
            ...definition.stream.ingest,
            processing: {
              ...omit(definition.stream.ingest.processing, ['updated_at']),
            },
          },
        };
      }

      return updateStream(
        Streams.all.UpsertRequest.parse({
          dashboards: definition.dashboards,
          queries: definition.queries,
          rules: definition.rules,
          stream: {
            ...stream,
            description: nextDescription,
          },
        })
      )
        .then(() => {
          if (!silent) {
            notifications.toasts.addSuccess({
              title: i18n.translate(
                'xpack.streams.streamDetailView.streamDescription.saveSuccessTitle',
                {
                  defaultMessage: 'Description saved',
                }
              ),
            });
          }
        })
        .catch((error) => {
          if (!silent) {
            notifications.toasts.addError(error, {
              title: i18n.translate(
                'xpack.streams.streamDetailView.streamDescription.saveErrorTitle',
                {
                  defaultMessage: 'Failed to save description',
                }
              ),
              toastMessage: getFormattedError(error).message,
            });
          }
        })
        .finally(() => {
          setIsUpdating(false);
          refreshDefinition();
        });
    },
    [
      silent,
      updateStream,
      definition.dashboards,
      definition.queries,
      definition.rules,
      definition.stream,
      notifications.toasts,
      refreshDefinition,
    ]
  );

  const generate = useCallback(async () => {
    if (!aiFeatures?.genAiConnectors.selectedConnector) {
      return;
    }

    setIsGenerating(true);

    try {
      const { from, to } = getLast24HoursTimeRange();
      const { description: generatedDescription, tokensUsed } = await firstValueFrom(
        streams.streamsRepositoryClient.stream('POST /internal/streams/{name}/_describe_stream', {
          signal,
          params: {
            path: {
              name: definition.stream.name,
            },
            query: {
              connectorId: aiFeatures.genAiConnectors.selectedConnector,
              from,
              to,
            },
          },
        })
      );

      setDescription(generatedDescription);

      telemetryClient.trackStreamDescriptionGenerated({
        stream_name: definition.stream.name,
        stream_type: getStreamTypeFromDefinition(definition.stream),
        input_tokens_used: tokensUsed.prompt,
        output_tokens_used: tokensUsed.completion,
      });

      return generatedDescription;
    } catch (error) {
      setIsGenerating(false);
      if (error.name === 'AbortError') {
        return;
      }
      if (!silent) {
        notifications.toasts.addError(error, {
          title: i18n.translate(
            'xpack.streams.streamDetailView.streamDescription.generateErrorTitle',
            { defaultMessage: 'Failed to generate description' }
          ),
          toastMessage: getFormattedError(error).message,
        });
      }
    } finally {
      setIsGenerating(false);
    }
  }, [
    silent,
    aiFeatures?.genAiConnectors.selectedConnector,
    streams.streamsRepositoryClient,
    signal,
    definition.stream,
    telemetryClient,
    notifications.toasts,
  ]);

  const onCancelEdit = useCallback(() => {
    setDescription(definition.stream.description);
    setIsEditing(false);
  }, [setIsEditing, setDescription, definition.stream.description]);

  const onGenerateDescription = useCallback(async () => {
    const result = await generate();
    if (result) {
      setIsEditing(true);
    }
    return result;
  }, [generate, setIsEditing]);

  const onStartEditing = useCallback(() => {
    setIsEditing(true);
  }, [setIsEditing]);

  const onSaveDescription = useCallback(
    (desc?: string) => {
      const generatedDescription = desc ?? description;
      if (generatedDescription !== definition.stream.description) {
        return save(generatedDescription).then(() => setIsEditing(false));
      }
      setIsEditing(false);
    },
    [description, definition.stream.description, save, setIsEditing]
  );

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
    abort,
  };
};
