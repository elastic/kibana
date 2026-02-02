/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flattenObjectNestedLast } from '@kbn/object-utils';
import type { StreamlangStepWithUIAttributes } from '@kbn/streamlang';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import type { FlattenRecord } from '@kbn/streams-schema';
import { get } from 'lodash';
import { useKibana } from '../../../../../../../hooks/use_kibana';
import type {
  PreviewDocsFilterOption,
  SampleDocumentWithUIAttributes,
} from '../../../../state_management/simulation_state_machine';
import {
  selectOriginalPreviewRecords,
  selectPreviewRecords,
} from '../../../../state_management/simulation_state_machine/selectors';
import { simulateProcessing } from '../../../../state_management/simulation_state_machine/simulation_runner_actor';
import { useSimulatorSelector } from '../../../../state_management/stream_enrichment_state_machine';

/**
 * Prepares samples for pattern extraction by:
 * 1. Flattening original samples
 * 2. Optionally running partial simulation if there are previous processing steps
 * 3. Applying preview document filters
 */
export async function prepareSamplesForPatternExtraction(
  originalSamples: SampleDocumentWithUIAttributes[],
  stepsWithoutCurrent: StreamlangStepWithUIAttributes[],
  previewDocsFilter: PreviewDocsFilterOption,
  streamsRepositoryClient: StreamsRepositoryClient,
  streamName: string
): Promise<FlattenRecord[]> {
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
        streamName,
        steps: stepsWithoutCurrent,
        documents: samples,
      },
    });

    samples = selectPreviewRecords.resultFunc(
      originalSamples,
      previewDocsFilter,
      simulation.documents
    );
  }

  return samples;
}

/**
 * Extracts string messages from a specific field in the samples.
 * Filters out non-string values.
 */
export function extractMessagesFromField(samples: FlattenRecord[], fieldName: string): string[] {
  return samples.reduce<string[]>((acc, sample) => {
    const value = get(sample, fieldName);
    if (typeof value === 'string') {
      acc.push(value);
    }
    return acc;
  }, []);
}

/**
 * Custom hook that provides common dependencies needed for pattern suggestions.
 * Returns Kibana services, abort controller, and simulator state.
 */
export function usePatternSuggestionDependencies() {
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

  return {
    notifications,
    telemetryClient,
    streamsRepositoryClient,
    stepsWithoutCurrent,
    previewDocsFilter,
    originalSamples,
  };
}
