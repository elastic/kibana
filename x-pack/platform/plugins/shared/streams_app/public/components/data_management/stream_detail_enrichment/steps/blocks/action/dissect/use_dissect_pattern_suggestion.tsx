/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlattenRecord } from '@kbn/streams-schema';
import { useAbortController } from '@kbn/react-hooks';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { flattenObjectNestedLast } from '@kbn/object-utils';
import {
  getReviewFields,
  getDissectProcessorWithReview,
  extractDissectPatternDangerouslySlow,
} from '@kbn/dissect-heuristics';
import { get } from 'lodash';
import { lastValueFrom } from 'rxjs';
import { useKibana } from '../../../../../../../hooks/use_kibana';
import {
  selectOriginalPreviewRecords,
  selectPreviewRecords,
} from '../../../../state_management/simulation_state_machine/selectors';
import { useSimulatorSelector } from '../../../../state_management/stream_enrichment_state_machine';
import { simulateProcessing } from '../../../../state_management/simulation_state_machine/simulation_runner_actor';

export const SUGGESTED_DISSECT_PROCESSOR_ID = 'dissect-processor';

export interface DissectPatternSuggestionParams {
  streamName: string;
  connectorId: string;
  fieldName: string;
}

export function useDissectPatternSuggestion() {
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
  const stepsWithoutCurrent = useSimulatorSelector((snapshot) =>
    snapshot.context.steps.slice(0, -1)
  );
  const previewDocsFilter = useSimulatorSelector((snapshot) => snapshot.context.previewDocsFilter);
  const originalSamples = useSimulatorSelector((snapshot) =>
    selectOriginalPreviewRecords(snapshot.context)
  );

  return useAsyncFn(
    async (params: DissectPatternSuggestionParams | null) => {
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
      if (stepsWithoutCurrent.length > 0) {
        const simulation = await simulateProcessing({
          streamsRepositoryClient,
          input: {
            streamName: params.streamName,
            steps: stepsWithoutCurrent,
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

      const finishTrackingAndReport = telemetryClient.startTrackingAIDissectSuggestionLatency({
        name: params.streamName,
        field: params.fieldName,
        connector_id: params.connectorId,
      });

      // Extract dissect pattern from all messages
      const dissectPattern = extractDissectPatternDangerouslySlow(messages);

      // The only reason we're streaming the response here is to avoid timeout issues prevalent with long-running requests to LLMs.
      // There is only ever going to be a single event emitted so we can safely use `lastValueFrom`.
      const reviewResult = await lastValueFrom(
        streamsRepositoryClient.stream(
          'POST /internal/streams/{name}/processing/_suggestions/dissect',
          {
            signal: abortController.signal,
            params: {
              path: { name: params.streamName },
              body: {
                connector_id: params.connectorId,
                sample_messages: messages.slice(0, 10),
                review_fields: getReviewFields(dissectPattern, 10),
              },
            },
          }
        )
      );

      const dissectProcessor = getDissectProcessorWithReview(
        dissectPattern,
        reviewResult.dissectProcessor,
        params.fieldName
      );

      // Run simulation to validate the processor
      const simulationResult = await streamsRepositoryClient.fetch(
        'POST /internal/streams/{name}/processing/_simulate',
        {
          signal: abortController.signal,
          params: {
            path: { name: params.streamName },
            body: {
              documents: samples,
              processing: {
                steps: [
                  {
                    action: 'dissect',
                    customIdentifier: SUGGESTED_DISSECT_PROCESSOR_ID,
                    from: params.fieldName,
                    pattern: dissectProcessor.pattern,
                  },
                ],
              },
            },
          },
        }
      );

      const parsedRate =
        simulationResult.processors_metrics[SUGGESTED_DISSECT_PROCESSOR_ID].parsed_rate;

      finishTrackingAndReport(1, [parsedRate]);

      return {
        dissectProcessor,
        simulationResult,
      };
    },
    [
      abortController,
      stepsWithoutCurrent,
      previewDocsFilter,
      originalSamples,
      notifications,
      streamsRepositoryClient,
      telemetryClient,
    ]
  );
}
