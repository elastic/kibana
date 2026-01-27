/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { Streams } from '@kbn/streams-schema';
import { omit } from 'lodash';
import { i18n } from '@kbn/i18n';
import { useAbortController } from '@kbn/react-hooks';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { isHttpFetchError } from '@kbn/server-route-repository-client';
import { getLast24HoursTimeRange } from '../../../util/time_range';
import { getFormattedError } from '../../../util/errors';
import { useUpdateStreams } from '../../../hooks/use_update_streams';
import { useKibana } from '../../../hooks/use_kibana';

export const useStreamDescriptionApi = ({
  definition,
  refreshDefinition,
  silent = false,
}: {
  definition: Streams.all.GetResponse;
  refreshDefinition: () => void;
  silent?: boolean;
}) => {
  const { signal } = useAbortController();

  const updateStream = useUpdateStreams(definition.stream.name);

  const {
    core: { notifications },
    dependencies: {
      start: { streams },
    },
  } = useKibana();

  const [description, setDescription] = useState(definition.stream.description || '');

  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Save the updated description; show success and error toasts unless silent
  const save = useCallback(
    async (nextDescription: string) => {
      setIsUpdating(true);

      const stream = {
        ...omit(definition.stream, ['name', 'updated_at']),
        ingest: {
          ...definition.stream.ingest,
          processing: {
            ...omit(definition.stream.ingest.processing, ['updated_at']),
          },
        },
      };

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

  const onStartEditing = useCallback(() => {
    setIsEditing(true);
  }, [setIsEditing]);

  const getDescriptionGenerationStatus = useCallback(async () => {
    return await streams.streamsRepositoryClient.fetch(
      'GET /internal/streams/{name}/_description_generation/_status',
      {
        signal,
        params: {
          path: { name: definition.stream.name },
        },
      }
    );
  }, [definition.stream.name, signal, streams.streamsRepositoryClient]);

  const scheduleDescriptionGenerationTask = useCallback(
    async (connectorId: string) => {
      const { from, to } = getLast24HoursTimeRange();
      await streams.streamsRepositoryClient.fetch(
        'POST /internal/streams/{name}/_description_generation/_task',
        {
          signal,
          params: {
            path: { name: definition.stream.name },
            body: {
              action: 'schedule',
              to,
              from,
              connectorId,
            },
          },
        }
      );
    },
    [definition.stream.name, signal, streams.streamsRepositoryClient]
  );

  const [{ loading: isSchedulingGenerationTask }, doScheduleGenerationTask] = useAsyncFn(
    scheduleDescriptionGenerationTask
  );

  const cancelDescriptionGenerationTask = useCallback(async () => {
    await streams.streamsRepositoryClient.fetch(
      'POST /internal/streams/{name}/_description_generation/_task',
      {
        signal,
        params: {
          path: { name: definition.stream.name },
          body: {
            action: 'cancel',
          },
        },
      }
    );
  }, [definition.stream.name, signal, streams.streamsRepositoryClient]);

  const acknowledgeDescriptionGenerationTask = useCallback(async () => {
    try {
      await streams.streamsRepositoryClient.fetch(
        'POST /internal/streams/{name}/_description_generation/_task',
        {
          signal,
          params: {
            path: { name: definition.stream.name },
            body: {
              action: 'acknowledge',
            },
          },
        }
      );
    } catch (error) {
      if (!(isHttpFetchError(error) && error.response?.status === 409)) {
        throw error;
      }
    }
  }, [definition.stream.name, signal, streams.streamsRepositoryClient]);

  const [{ loading: isTaskLoading, value: task, error: taskError }, refreshTask] = useAsyncFn(
    getDescriptionGenerationStatus
  );

  const onCancelEdit = useCallback(() => {
    acknowledgeDescriptionGenerationTask()
      .then(refreshTask)
      .then(() => {
        setDescription(definition.stream.description);
        setIsEditing(false);
      });
  }, [acknowledgeDescriptionGenerationTask, definition.stream.description, refreshTask]);

  const onSaveDescription = useCallback(
    (desc?: string) => {
      acknowledgeDescriptionGenerationTask().then(() => {
        const generatedDescription = desc ?? description;
        if (generatedDescription !== definition.stream.description) {
          return save(generatedDescription).then(() => setIsEditing(false));
        }
        setIsEditing(false);
      });
    },
    [acknowledgeDescriptionGenerationTask, description, definition.stream.description, save]
  );

  useEffect(() => {
    if (task?.status === 'completed') {
      setDescription(task.description);
      setIsEditing(true);
    }
  }, [task, description]);

  const areButtonsDisabled =
    isSchedulingGenerationTask ||
    task?.status === 'in_progress' ||
    task?.status === 'being_canceled' ||
    isTaskLoading ||
    isUpdating;

  return {
    description,
    setDescription,
    isUpdating,
    isEditing,
    onCancelEdit,
    onStartEditing,
    onSaveDescription,
    isTaskLoading,
    task,
    taskError,
    refreshTask,
    getDescriptionGenerationStatus,
    scheduleDescriptionGenerationTask: doScheduleGenerationTask,
    cancelDescriptionGenerationTask,
    acknowledgeDescriptionGenerationTask,
    areButtonsDisabled,
  };
};
