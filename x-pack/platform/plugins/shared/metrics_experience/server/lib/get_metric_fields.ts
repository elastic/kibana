/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Fields } from '@elastic/elasticsearch/lib/api/types';
import { type ElasticsearchClient, type Logger } from '@kbn/core/server';
import { type MetricField } from '../types';
import { deduplicateFields } from './deduplicate_fields';
import { getEcsFieldDescriptions } from './get_ecs_field_descriptions';
import { extractTimeSeriesFields } from './extract_time_series_fields';
import {
  batchedSampleMetricDocuments,
  SampleMetricDocumentsResults,
} from './sample_metric_documents';
import { extractDimensions } from './extract_dimensions';
import { buildMetricField } from './build_data_stream_field';
import { retrieveFieldCaps } from './retrieve_fieldcaps';

export async function getMetricFields({
  indexPattern,
  fields = '*',
  from,
  to,
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  indexPattern: string;
  fields?: Fields;
  from?: string;
  to?: string;
  logger: Logger;
}): Promise<MetricField[]> {
  if (!indexPattern) return [];

  try {
    // Wait for all field caps requests to complete
    const fieldCapsResults = await retrieveFieldCaps({
      esClient,
      indexPattern,
      to,
      from,
      fields,
    });

    // Process results from each data stream
    const allFields: MetricField[] = [];
    const allSamplingPromises: SampleMetricDocumentsResults[] = [];

    for (const fieldCapResult of fieldCapsResults) {
      if (!fieldCapResult) continue;
      const { dataStreamName, fieldCaps } = fieldCapResult;
      if (Object.keys(fieldCaps).length === 0) continue;

      const timeSeriesFields = extractTimeSeriesFields(fieldCaps);

      // Get all dimensions for context
      const allDimensions = extractDimensions(fieldCaps);

      // Process only metric fields (not dimensions) for the main results
      const metricFields = timeSeriesFields.filter((field) => field.fieldType === 'metric');

      // Build initial data stream objects for deduplication
      const initialFields: MetricField[] = [];
      for (const { fieldName, type, typeInfo } of metricFields) {
        initialFields.push(
          buildMetricField(
            fieldName,
            dataStreamName, // Use data stream name as index value
            allDimensions, // Use all dimensions initially
            type,
            typeInfo
          )
        );
      }

      // Deduplicate fields before sampling to reduce work
      const deduped = deduplicateFields(initialFields);

      // Collect metric names for sampling
      const metricNames = deduped.map((field) => field.name);

      if (metricNames.length > 0) {
        // Add sampling promise for this data stream
        allSamplingPromises.push(
          batchedSampleMetricDocuments({
            esClient,
            indexPattern: dataStreamName,
            metricNames,
            batchSize: 500,
            logger,
            dimensionFields: allDimensions.map((field) => field.name),
          })
        );

        // Store the fields with their field caps for later processing
        for (const field of deduped) {
          (field as any)._fieldCaps = fieldCaps;
        }

        allFields.push(...deduped);
      }
    }

    // Wait for all sampling operations to complete
    const samplingResults = await Promise.all(allSamplingPromises);

    // Merge sampling results
    const allSampledDocs = new Map<string, string[]>();

    for (const samplingMap of samplingResults) {
      for (const [key, value] of samplingMap) {
        if (!allSampledDocs.has(key)) {
          allSampledDocs.set(key, value);
        }
      }
    }

    // Pre-compute all unique dimension field combinations to avoid repeated extraction
    const uniqueDimensionSets = new Map<string, Array<{ name: string; type: string }>>();

    // Update dimensions based on actual sampled documents
    for (const field of allFields) {
      // Get the sampled document fields for this metric
      const actualFields = allSampledDocs.get(field.name) || [];
      const fieldCaps = (field as any)._fieldCaps;

      if (actualFields.length > 0) {
        // Create cache key from sorted field names
        const cacheKey = actualFields.sort().join(',');

        // Check if we've already computed dimensions for this field combination
        if (!uniqueDimensionSets.has(cacheKey)) {
          uniqueDimensionSets.set(cacheKey, extractDimensions(fieldCaps, actualFields));
        }

        field.dimensions = uniqueDimensionSets.get(cacheKey)!;
        field.no_data = false;
      } else {
        // No sample documents found - set no_data flag
        field.no_data = true;
      }
      // Otherwise keep all dimensions as fallback
      // Clean up temporary field caps reference
      delete (field as any)._fieldCaps;
    }

    // Get ECS descriptions for all field names
    const allFieldNames = allFields.map((field) => field.name);
    const ecsDescriptions = getEcsFieldDescriptions(allFieldNames);

    return (
      allFields
        .map((field) => {
          const ecsDescription = ecsDescriptions.get(field.name);

          // Priority: existing description -> ECS description
          const description = field.description || ecsDescription;
          const source = field.description ? 'custom' : ecsDescription ? 'ecs' : 'custom';

          return {
            ...field,
            description,
            unit: field.unit,
            source,
            // Sort dimensions alphabetically by name
            dimensions: field.dimensions.sort((a, b) => a.name.localeCompare(b.name)),
          };
        })
        // Sort fields alphabetically by name
        .sort((a, b) => a.name.localeCompare(b.name))
    );
  } catch (err) {
    logger.error(`Error fetching fields for index pattern ${indexPattern}: ${err.message}`);
    return [];
  }
}
