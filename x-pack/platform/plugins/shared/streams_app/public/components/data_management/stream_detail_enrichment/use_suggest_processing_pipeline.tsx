/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { useAbortController } from '@kbn/react-hooks';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { lastValueFrom, map } from 'rxjs';
import { streamlangDSLSchema, type StreamlangDSL } from '@kbn/streamlang';
import { useKibana } from '../../../hooks/use_kibana';
import { selectPreviewRecords } from './state_management/simulation_state_machine/selectors';
import { useSimulatorSelector } from './state_management/stream_enrichment_state_machine';
import { useGrokPatternSuggestion } from './steps/blocks/action/grok/use_grok_pattern_suggestion';

export const SUGGESTED_GROK_PROCESSOR_ID = 'grok-processor';

export interface SuggestProcessingParams {
  streamName: string;
  connectorId: string;
  fieldName: string;
}

export function useSuggestProcessingPipeline(
  abortController: ReturnType<typeof useAbortController>
) {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const previewDocuments = useSimulatorSelector((snapshot) =>
    selectPreviewRecords(snapshot.context)
  );

  const [, suggestGrokPattern] = useGrokPatternSuggestion(abortController);

  async function suggestProcessing(params: null): Promise<undefined>;
  async function suggestProcessing(params: SuggestProcessingParams): Promise<StreamlangDSL>;
  async function suggestProcessing(params: SuggestProcessingParams | null) {
    if (params === null) {
      return Promise.resolve(undefined); // Reset to initial value
    }

    const { grokProcessor } = await suggestGrokPattern({
      streamName: params.streamName,
      connectorId: params.connectorId,
      fieldName: params.fieldName,
    });

    // The only reason we're streaming the response here is to avoid timeout issues prevalent with long-running requests to LLMs.
    // There is only ever going to be a single event emitted so we can safely use `lastValueFrom`.
    return lastValueFrom(
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
                from: params.fieldName,
                patterns: grokProcessor.patterns as [string, ...string[]],
              },
              start: 0,
              end: 0,
            },
          },
        })
        .pipe(map((event) => streamlangDSLSchema.parse(event.pipeline)))
    );
  }

  return useAsyncFn(suggestProcessing, [abortController, streamsRepositoryClient]);
}
