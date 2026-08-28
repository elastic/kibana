/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import { lastValueFrom, map } from 'rxjs';
import { fromPromise } from 'xstate';
import type { IToasts, NotificationsStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { flattenObjectNestedLast } from '@kbn/object-utils';
import type { FlattenRecord } from '@kbn/streams-schema';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import type { StreamsTelemetryClient } from '../../../../../../telemetry/client';
import { getFormattedError } from '../../../../../../util/errors';
import {
  NoSuggestionsError,
  isNoSuggestionsError,
} from '../../steps/blocks/action/utils/no_suggestions_error';
import { processorsToUiDefinition } from '../../ingest_pipeline_processors';
import type { SampleDocumentWithUIAttributes } from '../simulation_state_machine/types';
import { stripMetadataFields } from '../simulation_state_machine/utils';
import type { PipelineProcessorsUiDefinition } from '../../types';

export interface SuggestPipelineInputMinimal {
  streamName: string;
  connectorId: string;
  documents: SampleDocumentWithUIAttributes[];
}

export interface SuggestPipelineInput extends SuggestPipelineInputMinimal {
  signal: AbortSignal;
  streamsRepositoryClient: StreamsRepositoryClient;
  telemetryClient: StreamsTelemetryClient;
  notifications: NotificationsStart;
}

// Intentionally parked in the native ingest-pipeline UI for now. Pipeline
// suggestions need to return native ingest-pipeline processor definitions
// before this actor can be wired back into the active machine.
const isIngestProcessorContainerArray = (
  pipeline: unknown
): pipeline is IngestProcessorContainer[] => {
  return (
    Array.isArray(pipeline) &&
    pipeline.every((processor) => {
      return (
        processor !== null &&
        typeof processor === 'object' &&
        !Array.isArray(processor) &&
        Object.keys(processor).length > 0
      );
    })
  );
};

export async function suggestPipelineLogic(
  input: SuggestPipelineInput
): Promise<PipelineProcessorsUiDefinition> {
  const documents: FlattenRecord[] = stripMetadataFields(
    input.documents.map((doc) => flattenObjectNestedLast(doc.document) as FlattenRecord)
  );

  const processors = await lastValueFrom(
    input.streamsRepositoryClient
      .stream('POST /internal/streams/{name}/_suggest_processing_pipeline', {
        signal: input.signal,
        params: {
          path: { name: input.streamName },
          body: {
            connector_id: input.connectorId,
            documents,
            response_format: 'ingest_pipeline',
          },
        },
      })
      .pipe(
        map((event) => {
          if (event.pipeline === null) {
            throw new NoSuggestionsError(
              i18n.translate(
                'xpack.streams.streamDetailView.managementTab.enrichment.noSuggestionsError',
                {
                  defaultMessage: 'Could not generate suggestions',
                }
              )
            );
          }

          if (!isIngestProcessorContainerArray(event.pipeline) || event.pipeline.length === 0) {
            throw new NoSuggestionsError(
              i18n.translate(
                'xpack.streams.streamDetailView.managementTab.enrichment.noSuggestionsError',
                {
                  defaultMessage: 'Could not generate suggestions',
                }
              )
            );
          }

          return event.pipeline;
        })
      )
  );

  return processorsToUiDefinition(processors);
}

export const createSuggestPipelineActor = ({
  streamsRepositoryClient,
  telemetryClient,
  notifications,
}: {
  streamsRepositoryClient: StreamsRepositoryClient;
  telemetryClient: StreamsTelemetryClient;
  notifications: NotificationsStart;
}) => {
  return fromPromise<PipelineProcessorsUiDefinition, SuggestPipelineInputMinimal>(
    async ({ input, signal }) =>
      suggestPipelineLogic({
        ...input,
        signal,
        streamsRepositoryClient,
        telemetryClient,
        notifications,
      })
  );
};

export const createNotifySuggestionFailureNotifier =
  ({ toasts }: { toasts: IToasts }) =>
  (params: { event: unknown }) => {
    const event = params.event as { error: Error };

    if (isNoSuggestionsError(event.error)) {
      return;
    }

    const formattedError = getFormattedError(event.error);
    toasts.addError(formattedError, {
      title: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.suggestionError',
        { defaultMessage: 'Failed to generate pipeline suggestion' }
      ),
    });
  };
