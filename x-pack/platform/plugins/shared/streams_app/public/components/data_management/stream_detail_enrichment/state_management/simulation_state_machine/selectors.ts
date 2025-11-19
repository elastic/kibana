/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';

import type { FlattenRecord, NamedFieldDefinitionConfig } from '@kbn/streams-schema';
import { flattenObjectNestedLast } from '@kbn/object-utils';
import { Streams } from '@kbn/streams-schema';
import type { SimulationContext } from './types';
import { getFilterSimulationDocumentsFn } from './utils';
import type { StreamEnrichmentContextType } from '../stream_enrichment_state_machine/types';
import { regroupGeoPointFieldsForDisplay } from '../../../utils/geo_point_utils';

/**
 * Helper function to get field definitions from enrichment context
 */
function getFieldDefinitionsArray(
  enrichmentContext?: StreamEnrichmentContextType
): NamedFieldDefinitionConfig[] {
  if (!enrichmentContext) {
    return [];
  }
  const fieldDefinitions = Streams.WiredStream.GetResponse.is(enrichmentContext.definition)
    ? enrichmentContext.definition.stream.ingest.wired.fields
    : enrichmentContext.definition.stream.ingest.classic.field_overrides || {};
  return Object.entries(fieldDefinitions).map(([name, field]) => ({
    name,
    ...field,
  }));
}

/**
 * Selects the documents used for the data preview table.
 * Optionally applies geo_point regrouping if enrichmentContext is provided.
 */
/**
 * Selects the documents used for the data preview table.
 */
export const selectPreviewRecords = createSelector(
  [
    (context: Pick<SimulationContext, 'samples'>) => context.samples,
    (context: Pick<SimulationContext, 'previewDocsFilter'>) => context.previewDocsFilter,
    (context: Pick<SimulationContext, 'simulation'>) => context.simulation?.documents,
  ],
  (samples, previewDocsFilter, documents) => {
    if (!previewDocsFilter || !documents) {
      return samples.map((sample) => flattenObjectNestedLast(sample.document) as FlattenRecord);
    }
    const filterFn = getFilterSimulationDocumentsFn(previewDocsFilter);
    return documents.filter(filterFn).map((doc) => doc.value);
  }
);

export const selectOriginalPreviewRecords = createSelector(
  [
    (context: SimulationContext) => context.samples,
    (context: SimulationContext) => context.previewDocsFilter,
    (context: SimulationContext) => context.simulation?.documents,
  ],
  (samples, previewDocsFilter, documents) => {
    if (!previewDocsFilter || !documents) {
      return samples;
    }
    const filterFn = getFilterSimulationDocumentsFn(previewDocsFilter);
    // return the samples where the filterFn matches the documents at the same index
    return samples.filter((_, index) => filterFn(documents[index]));
  }
);

export const selectHasSimulatedRecords = createSelector(
  [(context: SimulationContext) => context.simulation?.documents],
  (documents) => {
    return Boolean(documents && documents.length > 0);
  }
);

export const selectFieldsInSamples = (
  context: Pick<SimulationContext, 'samples'>,
  enrichmentContext?: StreamEnrichmentContextType
): string[] => {
  const { samples } = context;
  const fields = getFieldDefinitionsArray(enrichmentContext);
  const fieldSet = new Set<string>();

  samples.forEach((sample) => {
    const flattened = flattenObjectNestedLast(sample.document) as FlattenRecord;
    // Apply geo_point regrouping if fields are available
    const record =
      fields.length > 0 ? regroupGeoPointFieldsForDisplay(flattened, fields) : flattened;
    Object.keys(record).forEach((key) => fieldSet.add(key));
  });

  return Array.from(fieldSet).sort();
};
