/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FlattenRecord } from '@kbn/streams-schema';
import { useAbortController } from '@kbn/react-hooks';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { flattenObjectNestedLast } from '@kbn/object-utils';
import {
  getUsefulTokens,
  getReviewFields,
  getGrokProcessor,
} from '@kbn/streams-ai/shared/processing/templatize/format_root'; // eslint-disable-line @kbn/imports/no_boundary_crossing
import { syncExtractTemplate } from '@kbn/streams-ai/shared/processing/templatize/extract_template'; // eslint-disable-line @kbn/imports/no_boundary_crossing
import { get } from 'lodash';
import { useKibana } from '../../../../../hooks/use_kibana';
import { showErrorToast } from '../../../../../hooks/use_streams_app_fetch';
import {
  selectOriginalPreviewRecords,
  selectPreviewRecords,
} from '../../state_management/simulation_state_machine/selectors';
import { useSimulatorSelector } from '../../state_management/stream_enrichment_state_machine';
import { simulateProcessing } from '../../state_management/simulation_state_machine/simulation_runner_actor';

export interface GrokPatternSuggestionParams {
  streamName: string;
  connectorId: string;
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
  const processorsWithoutCurrent = useSimulatorSelector((snapshot) =>
    snapshot.context.processors.slice(0, -1)
  );
  const previewDocsFilter = useSimulatorSelector((snapshot) => snapshot.context.previewDocsFilter);
  const originalSamples = useSimulatorSelector((snapshot) =>
    selectOriginalPreviewRecords(snapshot.context)
  );

  return useAsyncFn(
    async (params: GrokPatternSuggestionParams | null) => {
      if (params === null) {
        return Promise.resolve(undefined); // Reset to initial value
      }

      let samples = originalSamples
        .map((doc) => doc.document)
        .map(flattenObjectNestedLast) as FlattenRecord[];

      /**
       * If there are processors, we run a partial simulation to get the samples.
       * If there are no processors, we use the original samples previously assigned.
       */
      if (processorsWithoutCurrent.length > 0) {
        const simulation = await simulateProcessing({
          streamsRepositoryClient,
          input: {
            streamName: params.streamName,
            processors: processorsWithoutCurrent,
            documents: samples,
          },
        });

        samples = selectPreviewRecords({
          samples: originalSamples,
          previewDocsFilter,
          simulation,
        });
      }

      const messages = samples.reduce<string[]>((acc, sample) => {
        const value = get(sample, params.fieldName);
        if (typeof value === 'string') {
          acc.push(value);
        }
        return acc;
      }, []);

      const finishTrackingAndReport = telemetryClient.startTrackingAIGrokSuggestionLatency({
        name: params.streamName,
        field: params.fieldName,
        connector_id: params.connectorId,
      });

      const { roots, delimiter } = syncExtractTemplate(messages);
      const { usefulTokens, usefulColumns } = getUsefulTokens(roots, delimiter);
      const reviewFields = getReviewFields(usefulColumns, 10);

      return streamsRepositoryClient
        .fetch('POST /internal/streams/{name}/processing/_suggestions/grok', {
          signal: abortController.signal,
          params: {
            path: { name: params.streamName },
            body: {
              connector_id: params.connectorId,
              sample_messages: messages.slice(0, 10),
              review_fields: reviewFields,
            },
          },
        })
        .then(
          (response) => {
            const grokProcessor = getGrokProcessor(usefulTokens, reviewFields, response);

            finishTrackingAndReport(1, [1]);

            return grokProcessor;
          },
          (error: Error) => {
            showErrorToast(notifications, error);
            throw error;
          }
        );
    },
    [
      abortController,
      processorsWithoutCurrent,
      previewDocsFilter,
      originalSamples,
      notifications,
      streamsRepositoryClient,
      telemetryClient,
    ]
  );
}
