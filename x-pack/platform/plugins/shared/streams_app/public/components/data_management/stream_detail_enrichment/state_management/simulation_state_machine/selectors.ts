/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';

import { flattenObjectNestedLast } from '@kbn/object-utils';
import type { FlattenRecord } from '@kbn/streams-schema';
import type { SimulationContext } from './types';
import { getFilterSimulationDocumentsFn } from './utils';

/**
 * Selects the simulated documents with applied filtering by
 * the selected condition and preview table filter (Parsed, Skipped, etc.).
 */
export const selectPreviewRecords = createSelector(
  [
    (context: Pick<SimulationContext, 'samples'>) => context.samples,
    (context: Pick<SimulationContext, 'previewDocsFilter'>) => context.previewDocsFilter,
    (context: Pick<SimulationContext, 'simulation'>) => context.simulation?.documents,
    (context: Pick<SimulationContext, 'selectedConditionId'>) => context.selectedConditionId,
  ],
  (samples, previewDocsFilter, documents, selectedConditionId) => {
    if (!previewDocsFilter || !documents) {
      return samples.map((sample) => flattenObjectNestedLast(sample.document)) as FlattenRecord[];
    }
    const filterFn = getFilterSimulationDocumentsFn(previewDocsFilter);
    const conditionFilterFn = selectedConditionId
      ? (doc: (typeof documents)[number]) =>
          doc.processed_by?.includes(selectedConditionId) ?? false
      : (_doc: (typeof documents)[number]) => true;

    return documents
      .filter(conditionFilterFn)
      .filter(filterFn)
      .map((doc) => doc.value);
  }
);

/**
 * Selects the original samples with applied filtering by
 * the selected condition and preview table filter (Parsed, Skipped, etc.).
 */
export const selectOriginalPreviewRecords = createSelector(
  [
    (context: SimulationContext) => context.samples,
    (context: SimulationContext) => context.previewDocsFilter,
    (context: SimulationContext) => context.simulation?.documents,
    (context: SimulationContext) => context.selectedConditionId,
  ],
  (samples, previewDocsFilter, documents, selectedConditionId) => {
    if (!previewDocsFilter || !documents) {
      return samples;
    }
    const filterFn = getFilterSimulationDocumentsFn(previewDocsFilter);
    // return the samples where the filterFn matches the documents at the same index
    return samples.filter((_, index) => {
      const doc = documents[index];
      if (!doc) return false;
      if (selectedConditionId && !(doc.processed_by?.includes(selectedConditionId) ?? false)) {
        return false;
      }
      return filterFn(doc);
    });
  }
);

/**
 * Selects an subset of samples be sent
 * for a simulation taking into account the currently
 * selected condition filter.
 *
 * If no condition is selected, all samples are returned.
 *
 * If a condition is selected, samples are filtered to include
 * only those that correspond to documents processed by
 * the processors which are direct descendants of the selected
 * condition.
 */
export const selectSamplesForSimulation = createSelector(
  [
    (context: SimulationContext) => context.samples,
    (context: SimulationContext) => context.baseSimulation?.documents,
    (context: SimulationContext) => context.steps,
    (context: SimulationContext) => context.selectedConditionId,
  ],
  (samples, baseSimulationDocuments = [], steps, selectedConditionId) => {
    // Always simulate on the full sample set.
    //
    // Filtering by condition is applied to the preview selectors using the condition-noop tag in `processed_by`.
    // This avoids biasing condition match rates to 100% by simulating only the already-matching docs.
    void baseSimulationDocuments;
    void steps;
    void selectedConditionId;
    return samples;
  }
);

export const selectHasSimulatedRecords = createSelector(
  [(context: SimulationContext) => context.simulation?.documents],
  (documents) => {
    return Boolean(documents && documents.length > 0);
  }
);

export const selectFieldsInSamples = createSelector(
  [(context: SimulationContext) => context.samples],
  (samples) => {
    const fieldSet = new Set<string>();
    samples.forEach((sample) => {
      const flattened = flattenObjectNestedLast(sample.document);
      Object.keys(flattened).forEach((key) => fieldSet.add(key));
    });
    return Array.from(fieldSet).sort();
  }
);
