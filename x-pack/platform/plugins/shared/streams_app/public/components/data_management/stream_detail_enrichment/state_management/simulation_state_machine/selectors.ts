/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';

import { flattenObjectNestedLast } from '@kbn/object-utils';
import type { FlattenRecord } from '@kbn/streams-schema';
import type { Simulation, SimulationContext } from './types';
import { getActiveSamples, getConditionDocIndexes, getFilterSimulationDocumentsFn } from './utils';

/**
 * Selects the documents used for the data preview table.
 */
export const selectPreviewRecords = createSelector(
  [
    (context: SimulationContext) => getActiveSamples(context),
    (context: Pick<SimulationContext, 'previewDocsFilter'>) => context.previewDocsFilter,
    (context: Pick<SimulationContext, 'simulation'>) => context.simulation?.documents,
    (context: SimulationContext) => getConditionDocIndexes(context),
  ],
  (activeSamples, previewDocsFilter, documents, docIndexes) => {
    if (!previewDocsFilter || !documents) {
      return activeSamples.map((sample) =>
        flattenObjectNestedLast(sample.document)
      ) as FlattenRecord[];
    }

    const activeDocuments = getActiveDocuments(documents, docIndexes, activeSamples.length);

    const filterFn = getFilterSimulationDocumentsFn(previewDocsFilter);
    return (activeDocuments ?? documents)
      .filter((doc): doc is Simulation['documents'][number] => !!doc && filterFn(doc))
      .map((doc) => doc.value);
  }
);

export const selectOriginalPreviewRecords = createSelector(
  [
    (context: SimulationContext) => getActiveSamples(context),
    (context: SimulationContext) => context.previewDocsFilter,
    (context: SimulationContext) => context.simulation?.documents,
    (context: SimulationContext) => getConditionDocIndexes(context),
  ],
  (activeSamples, previewDocsFilter, documents, docIndexes) => {
    if (!previewDocsFilter || !documents) {
      return activeSamples;
    }

    const activeDocuments = getActiveDocuments(documents, docIndexes, activeSamples.length);

    if (!activeDocuments) {
      return activeSamples;
    }

    const filterFn = getFilterSimulationDocumentsFn(previewDocsFilter);
    return activeSamples.filter((_, index) => {
      const doc = activeDocuments[index];
      return doc ? filterFn(doc) : false;
    });
  }
);

export const selectHasSimulatedRecords = createSelector(
  [(context: SimulationContext) => context.simulation?.documents],
  (documents) => {
    return Boolean(documents && documents.length > 0);
  }
);

export const selectFieldsInSamples = createSelector(
  [(context: SimulationContext) => getActiveSamples(context)],
  (samples) => {
    const fieldSet = new Set<string>();
    samples.forEach((sample) => {
      const flattened = flattenObjectNestedLast(sample.document);
      Object.keys(flattened).forEach((key) => fieldSet.add(key));
    });
    return Array.from(fieldSet).sort();
  }
);

const getActiveDocuments = (
  documents: Simulation['documents'] | undefined,
  docIndexes: number[] | undefined,
  activeSampleCount: number
) => {
  if (!documents) {
    return undefined;
  }

  if (!docIndexes || documents.length === activeSampleCount) {
    return documents;
  }

  return docIndexes
    .map((index) => documents[index])
    .filter((doc): doc is Simulation['documents'][number] => Boolean(doc));
};
