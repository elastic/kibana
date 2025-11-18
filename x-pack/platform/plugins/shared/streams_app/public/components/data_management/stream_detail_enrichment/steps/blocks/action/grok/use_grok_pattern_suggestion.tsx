/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlattenRecord } from '@kbn/streams-schema';
import type { useAbortController } from '@kbn/react-hooks';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { flattenObjectNestedLast } from '@kbn/object-utils';
import {
  getReviewFields,
  getGrokProcessor,
  mergeGrokProcessors,
  groupMessagesByPattern,
  extractGrokPatternDangerouslySlow,
  unwrapPatternDefinitions,
  type GrokProcessorResult,
} from '@kbn/grok-heuristics';
import { get } from 'lodash';
import { lastValueFrom } from 'rxjs';
import { useKibana } from '../../../../../../../hooks/use_kibana';
import { showErrorToast } from '../../../../../../../hooks/use_streams_app_fetch';
import {
  selectOriginalPreviewRecords,
  selectPreviewRecords,
} from '../../../../state_management/simulation_state_machine/selectors';
import { useSimulatorSelector } from '../../../../state_management/stream_enrichment_state_machine';
import { simulateProcessing } from '../../../../state_management/simulation_state_machine/simulation_runner_actor';
import type { Simulation } from '../../../../state_management/simulation_state_machine/types';

export const SUGGESTED_GROK_PROCESSOR_ID = 'grok-processor';

export interface GrokPatternSuggestionParams {
  streamName: string;
  connectorId: string;
  fieldName: string;
}

export interface GrokPatternSuggestionResult {
  grokProcessor: GrokProcessorResult;
  simulationResult: Simulation;
}

export function useGrokPatternSuggestion(abortController: ReturnType<typeof useAbortController>) {
  const {
    core: { notifications },
    services: { telemetryClient },
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const stepsWithoutCurrent = useSimulatorSelector((snapshot) =>
    snapshot.context.steps.slice(0, -1)
  );
  const previewDocsFilter = useSimulatorSelector((snapshot) => snapshot.context.previewDocsFilter);
  const originalSamples = useSimulatorSelector((snapshot) =>
    selectOriginalPreviewRecords(snapshot.context)
  );

  // Function overloads for the async function
  async function suggestGrokPattern(params: null): Promise<undefined>;
  async function suggestGrokPattern(
    params: GrokPatternSuggestionParams
  ): Promise<GrokPatternSuggestionResult>;
  async function suggestGrokPattern(
    params: GrokPatternSuggestionParams | null
  ): Promise<GrokPatternSuggestionResult | undefined> {
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

    const groupedMessages = groupMessagesByPattern(messages);

    const finishTrackingAndReport = telemetryClient.startTrackingAIGrokSuggestionLatency({
      name: params.streamName,
      field: params.fieldName,
      connector_id: params.connectorId,
    });

    const result = await Promise.allSettled(
      groupedMessages.map((group) => {
        const grokPatternNodes = extractGrokPatternDangerouslySlow(group.messages);

        // The only reason we're streaming the response here is to avoid timeout issues prevalent with long-running requests to LLMs.
        // There is only ever going to be a single event emitted so we can safely use `lastValueFrom`.
        return lastValueFrom(
          streamsRepositoryClient.stream(
            'POST /internal/streams/{name}/processing/_suggestions/grok',
            {
              signal: abortController.signal,
              params: {
                path: { name: params.streamName },
                body: {
                  connector_id: params.connectorId,
                  sample_messages: group.messages.slice(0, 10),
                  review_fields: getReviewFields(grokPatternNodes, 10),
                },
              },
            }
          )
        ).then((reviewResult) => {
          const grokProcessor = getGrokProcessor(grokPatternNodes, reviewResult.grokProcessor);

          return {
            ...grokProcessor,
            patterns: unwrapPatternDefinitions(grokProcessor), // NOTE: Inline patterns until we support custom pattern definitions in Streamlang
            pattern_definitions: {},
          };
        });
      })
    );

    const aggregateError = new AggregateError(
      result.reduce<Error[]>((acc, settledState) => {
        if (settledState.status === 'rejected') {
          acc.push(settledState.reason);
        }
        return acc;
      }, [])
    );

    const grokProcessors = result.reduce<GrokProcessorResult[]>((acc, settledState) => {
      if (settledState.status === 'fulfilled') {
        acc.push(settledState.value);
      }
      return acc;
    }, []);

    // If all promises failed, throw an aggregate error, otherwise ignore errors and continue with fulfilled results
    if (grokProcessors.length === 0) {
      finishTrackingAndReport(0, [0]);
      showErrorToast(notifications, aggregateError);
      throw aggregateError;
    }

    // Combine all grok processors into a single one with fallback patterns
    const combinedGrokProcessor = mergeGrokProcessors(grokProcessors);

    // Run simulation to get fields and metrics
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
                  action: 'grok',
                  customIdentifier: SUGGESTED_GROK_PROCESSOR_ID,
                  from: params.fieldName,
                  patterns: combinedGrokProcessor.patterns,
                },
              ],
            },
          },
        },
      }
    );

    finishTrackingAndReport(1, [
      simulationResult.processors_metrics[SUGGESTED_GROK_PROCESSOR_ID].parsed_rate,
    ]);

    return { grokProcessor: combinedGrokProcessor, simulationResult };
  }

  return useAsyncFn(suggestGrokPattern, [
    abortController,
    stepsWithoutCurrent,
    previewDocsFilter,
    originalSamples,
    notifications,
    streamsRepositoryClient,
    telemetryClient,
  ]);
}
