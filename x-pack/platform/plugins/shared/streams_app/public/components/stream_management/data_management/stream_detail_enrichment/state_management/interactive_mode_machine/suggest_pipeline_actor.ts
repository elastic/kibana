/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom, map } from 'rxjs';
import { fromPromise } from 'xstate';
import type { IToasts, NotificationsStart } from '@kbn/core/public';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import { streamlangDSLSchema, type StreamlangDSL } from '@kbn/streamlang';
import type { FlattenRecord } from '@kbn/streams-schema';
import { flattenObjectNestedLast } from '@kbn/object-utils';

import { i18n } from '@kbn/i18n';
import { getFormattedError } from '../../../../../../util/errors';
import type { StreamsTelemetryClient } from '../../../../../../telemetry/client';
import {
  NoSuggestionsError,
  isNoSuggestionsError,
} from '../../steps/blocks/action/utils/no_suggestions_error';
import type { SampleDocumentWithUIAttributes } from '../simulation_state_machine/types';

// Minimal input needed from state machine (services injected in implementation)
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

export async function suggestPipelineLogic(input: SuggestPipelineInput): Promise<StreamlangDSL> {
  const documents: FlattenRecord[] = input.documents.map(
    (doc) => flattenObjectNestedLast(doc.document) as FlattenRecord
  );

  const pipeline = await lastValueFrom(
    input.streamsRepositoryClient
      .stream('POST /internal/streams/{name}/_suggest_processing_pipeline', {
        signal: input.signal,
        params: {
          path: { name: input.streamName },
          body: {
            connector_id: input.connectorId,
            documents,
          },
        },
      })
      .pipe(
        map((event) => {
          // Handle case where LLM couldn't generate suggestions
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
          return streamlangDSLSchema.parse(event.pipeline);
        })
      )
  );

  return pipeline;
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
  return fromPromise<StreamlangDSL, SuggestPipelineInputMinimal>(async ({ input, signal }) =>
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

    // Don't show toast for NoSuggestionsError - UI will handle it inline
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
