/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortController } from '@kbn/react-hooks';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { useEffect, useState } from 'react';
import { lastValueFrom, map } from 'rxjs';
import { streamlangDSLSchema, type StreamlangDSL } from '@kbn/streamlang';
import { useKibana } from '../../../../hooks/use_kibana';
import { selectPreviewRecords } from '../state_management/simulation_state_machine/selectors';
import {
  useSimulatorSelector,
  useStreamEnrichmentEvents,
} from '../state_management/stream_enrichment_state_machine';
import { useGrokPatternSuggestion } from '../steps/blocks/action/grok/use_grok_pattern_suggestion';
import { PRIORITIZED_CONTENT_FIELDS, getDefaultTextField } from '../utils';

export const SUGGESTED_GROK_PROCESSOR_ID = 'grok-processor';

export interface SuggestPipelineParams {
  streamName: string;
  connectorId: string;
}

export function useSuggestPipeline() {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const abortController = useAbortController();
  const previewDocuments = useSimulatorSelector((snapshot) =>
    selectPreviewRecords(snapshot.context)
  );

  const { resetSteps } = useStreamEnrichmentEvents();
  const [, suggestGrokPattern] = useGrokPatternSuggestion(abortController);
  const [showSuggestion, setShowSuggestion] = useState(true);

  async function suggestPipeline(params: SuggestPipelineParams): Promise<StreamlangDSL>;
  async function suggestPipeline(params: SuggestPipelineParams) {
    const fieldName = getDefaultTextField(previewDocuments, PRIORITIZED_CONTENT_FIELDS);

    const { grokProcessor } = await suggestGrokPattern({
      streamName: params.streamName,
      connectorId: params.connectorId,
      fieldName,
    });

    // The only reason we're streaming the response here is to avoid timeout issues prevalent with long-running requests to LLMs.
    // There is only ever going to be a single event emitted so we can safely use `lastValueFrom`.
    const pipeline = await lastValueFrom(
      streamsRepositoryClient
        .stream('POST /internal/streams/{name}/_suggest_processing_pipeline', {
          signal: abortController.signal,
          params: {
            path: { name: params.streamName },
            body: {
              connector_id: params.connectorId,
              documents: previewDocuments,
              parsing_processor: {
                action: 'grok',
                from: fieldName,
                patterns: grokProcessor.patterns as [string, ...string[]],
              },
            },
          },
        })
        .pipe(map((event) => streamlangDSLSchema.parse(event.pipeline)))
    );

    // Add suggested steps to simulation for preview
    resetSteps(pipeline.steps);

    return pipeline;
  }

  const [state, execute] = useAsyncFn(suggestPipeline, [
    abortController,
    streamsRepositoryClient,
    resetSteps,
  ]);

  // Function to clear suggested steps from simulation
  const clearSuggestedSteps = () => {
    resetSteps([]);
    setShowSuggestion(false);
  };

  // Reset showSuggestion when a new suggestion request starts
  useEffect(() => {
    if (state.loading) {
      setShowSuggestion(true);
    }
  }, [state.loading]);

  // Clean up steps when component unmounts
  useEffect(() => {
    return () => {
      if (state.value) {
        resetSteps([]);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    state,
    showSuggestion,
    setShowSuggestion,
    suggestPipeline: execute,
    clearSuggestedSteps,
    abortController,
  };
}
