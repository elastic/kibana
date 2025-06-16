/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FlattenRecord } from '@kbn/streams-schema';
import { useAbortController } from '@kbn/react-hooks';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { useKibana } from '../../../../../hooks/use_kibana';
import { showErrorToast } from '../../../../../hooks/use_streams_app_fetch';

export interface GrokPatternSuggestionParams {
  streamName: string;
  connectorId: string;
  samples: FlattenRecord[];
  fieldName: string;
}

export function useGrokPatternSuggestion() {
  const {
    core: { notifications },
    services: { telemetryClient },
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const abortController = useAbortController();
  return useAsyncFn((params: GrokPatternSuggestionParams | null) => {
    if (params === null) {
      return Promise.resolve(undefined); // Reset to initial value
    }
    const finishTrackingAndReport = telemetryClient.startTrackingAIGrokSuggestionLatency({
      name: params.streamName,
      field: params.fieldName,
      connector_id: params.connectorId,
    });
    return streamsRepositoryClient
      .fetch('POST /internal/streams/{name}/processing/_suggestions', {
        signal: abortController.signal,
        params: {
          path: { name: params.streamName },
          body: {
            field: params.fieldName,
            connectorId: params.connectorId,
            samples: params.samples,
          },
        },
      })
      .then(
        (response) => {
          finishTrackingAndReport(
            response.length || 0,
            response.map(
              ({ simulationResult }) =>
                simulationResult.processors_metrics['grok-processor'].parsed_rate
            )
          );
          return response;
        },
        (error: Error) => {
          showErrorToast(notifications, error);
          throw error;
        }
      );
  });
}
