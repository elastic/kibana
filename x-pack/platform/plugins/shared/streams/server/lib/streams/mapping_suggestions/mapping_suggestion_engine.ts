/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
import { getFlattenedObject } from '@kbn/std';
import type { FieldDefinition, FieldDefinitionConfig } from '@kbn/streams-schema';
import { getParentId, Streams } from '@kbn/streams-schema';
import { FIELD_DEFINITION_TYPES, type FieldDefinitionType } from '@kbn/streams-schema/src/fields';
import type { FieldMetadataPlain } from '@kbn/fields-metadata-plugin/common';
import type { StreamsClient } from '../client';
import type {
  FieldCandidate,
  FieldOccurrence,
  MappingSuggestionConfig,
  MappingSuggestionFieldResult,
  MappingSuggestionResult,
  MappingSuggestionStats,
  SkipReason,
  TypeSource,
} from './types';

const DEFAULT_SAMPLE_SIZE = 500;
const DEFAULT_MIN_OCCURRENCE_RATE = 0.1; // 10%
const DEFAULT_TIME_RANGE_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Mapping suggestion engine that derives candidate fields from sample documents
 * and enriches them with metadata from ECS/OTEL field definitions.
 *
 * This engine:
 * 1. Samples documents from the stream (or parent stream for draft streams)
 * 2. Tracks field occurrence frequency across sampled documents
 * 3. Enriches fields with type suggestions from metadata services
 * 4. Filters out rarely-occurring fields and unsupported types
 * 5. Optionally auto-applies valid mappings to draft wired stream definitions
 * 6. Returns a serializable result suitable for orchestration tasks
 */
export class MappingSuggestionEngine {
  constructor(
    private readonly deps: {
      scopedClusterClient: IScopedClusterClient;
      streamsClient: StreamsClient;
      fieldsMetadataClient: IFieldsMetadataClient;
      logger: Logger;
    }
  ) {}

  /**
   * Generate mapping suggestions for a stream.
   *
   * When autoApply is true and the stream is a draft wired stream, the engine will:
   * 1. Apply valid field mappings to the stream's `ingest.wired.fields` definition
   * 2. Skip fields with conflicts or unsupported types (deterministic behavior)
   * 3. Preserve existing user-defined mappings
   *
   * @param streamName - Name of the stream to analyze
   * @param config - Configuration options for the suggestion engine
   * @returns Mapping suggestion result with per-field status and aggregate stats
   */
  async suggestMappings(
    streamName: string,
    config: MappingSuggestionConfig = {}
  ): Promise<MappingSuggestionResult> {
    const {
      sampleSize = DEFAULT_SAMPLE_SIZE,
      minOccurrenceRate = DEFAULT_MIN_OCCURRENCE_RATE,
      autoApply = false,
    } = config;

    const now = Date.now();
    const start = config.start ?? now - DEFAULT_TIME_RANGE_MS;
    const end = config.end ?? now;

    // 1. Get stream definition and determine source index
    const stream = await this.deps.streamsClient.getStream(streamName);

    if (!Streams.WiredStream.Definition.is(stream)) {
      throw new Error(`Stream ${streamName} is not a wired stream`);
    }

    // For draft streams, sample from parent stream since draft streams don't have their own data
    const isDraftStream = stream.ingest.wired.draft === true;
    let indexSourceStreamName = streamName;

    if (isDraftStream) {
      const parentId = getParentId(streamName);
      if (!parentId) {
        throw new Error(`Draft stream ${streamName} must have a parent stream`);
      }
      indexSourceStreamName = parentId;
    }

    // 2. Get existing stream fields (including inherited)
    const existingFields = await this.getStreamFields(stream);

    // 3. Sample documents and track field occurrences
    const { hits } = await this.sampleDocuments(indexSourceStreamName, start, end, sampleSize);

    if (hits.length === 0) {
      return this.createEmptyResult(streamName, false);
    }

    // 4. Calculate field occurrences
    const fieldOccurrences = this.calculateFieldOccurrences(hits);

    // 5. Get field candidates with occurrence rates
    const fieldCandidates = this.getFieldCandidates(fieldOccurrences, hits.length, existingFields);

    // 6. Enrich with metadata (ECS/OTEL types)
    const enrichedCandidates = await this.enrichWithMetadata(fieldCandidates);

    // 7. Get ES field capabilities for additional type info
    const fieldCaps = await this.getFieldCapabilities(indexSourceStreamName);
    this.enrichWithFieldCaps(enrichedCandidates, fieldCaps);

    // 8. Generate field results
    const fieldResults = this.generateFieldResults(
      enrichedCandidates,
      existingFields,
      minOccurrenceRate
    );

    // 9. Build applied mappings
    const appliedMappings = this.buildAppliedMappings(fieldResults);

    // 10. Calculate stats
    const stats = this.calculateStats(fieldResults);

    // 11. Auto-apply mappings if requested and stream is a draft wired stream
    let applied = false;
    let applyError: string | undefined;

    if (autoApply && isDraftStream && Object.keys(appliedMappings).length > 0) {
      const applyResult = await this.applyMappingsToStream(stream, appliedMappings);
      applied = applyResult.applied;
      applyError = applyResult.error;
    }

    return {
      streamName,
      applied,
      fields: fieldResults,
      stats,
      appliedMappings,
      timestamp: new Date().toISOString(),
      ...(applyError ? { error: applyError } : {}),
    };
  }

  /**
   * Apply field mappings to a draft wired stream definition.
   *
   * This method:
   * 1. Merges suggested mappings with existing stream fields
   * 2. Preserves existing user-defined mappings (no overwrites)
   * 3. Persists the updated definition via streamsClient
   *
   * @param stream - The draft wired stream definition
   * @param mappings - Field mappings to apply
   * @returns Result indicating whether the apply succeeded
   */
  private async applyMappingsToStream(
    stream: Streams.WiredStream.Definition,
    mappings: Record<string, FieldDefinitionConfig>
  ): Promise<{ applied: boolean; error?: string }> {
    try {
      // Merge new mappings with existing fields, preserving existing definitions
      const mergedFields: FieldDefinition = {
        ...stream.ingest.wired.fields,
      };

      for (const [fieldName, fieldConfig] of Object.entries(mappings)) {
        // Only add if the field doesn't already exist in the stream's own fields
        if (!(fieldName in stream.ingest.wired.fields)) {
          mergedFields[fieldName] = fieldConfig;
        }
      }

      // Update the stream with the merged fields
      await this.deps.streamsClient.upsertStream({
        name: stream.name,
        request: {
          dashboards: [],
          queries: [],
          rules: [],
          stream: {
            description: stream.description,
            ingest: {
              ...stream.ingest,
              wired: {
                ...stream.ingest.wired,
                fields: mergedFields,
              },
              processing: {
                steps: stream.ingest.processing.steps,
              },
            },
          },
        },
      });

      this.deps.logger.info(
        `Applied ${Object.keys(mappings).length} field mappings to draft stream ${stream.name}`
      );

      return { applied: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.deps.logger.error(
        `Failed to apply mappings to draft stream ${stream.name}: ${errorMessage}`
      );
      return { applied: false, error: errorMessage };
    }
  }

  /**
   * Get all fields for a stream including inherited fields from ancestors
   */
  private async getStreamFields(stream: Streams.WiredStream.Definition): Promise<FieldDefinition> {
    const ancestors = await this.deps.streamsClient.getAncestors(stream.name);

    const inheritedFields: FieldDefinition = {};
    for (const ancestor of ancestors) {
      if (Streams.WiredStream.Definition.is(ancestor)) {
        Object.assign(inheritedFields, ancestor.ingest.wired.fields);
      }
    }

    return { ...inheritedFields, ...stream.ingest.wired.fields };
  }

  /**
   * Sample documents from the stream using random scoring for representative sampling
   */
  private async sampleDocuments(
    streamName: string,
    start: number,
    end: number,
    size: number
  ): Promise<{ hits: SearchHit[]; total: number }> {
    try {
      const response = await this.deps.scopedClusterClient.asCurrentUser.search({
        index: streamName,
        size,
        track_total_hits: true,
        timeout: '10s',
        query: {
          bool: {
            must: [
              {
                range: {
                  '@timestamp': {
                    gte: start,
                    lte: end,
                    format: 'epoch_millis',
                  },
                },
              },
            ],
            should: [
              {
                function_score: {
                  functions: [{ random_score: {} }],
                },
              },
            ],
          },
        },
        sort: {
          _score: { order: 'desc' },
        },
        _source: true,
      });

      const total =
        typeof response.hits.total === 'number'
          ? response.hits.total
          : response.hits.total?.value ?? 0;

      return {
        hits: response.hits.hits,
        total,
      };
    } catch (error) {
      // If the index doesn't exist or has no data, return empty
      if (error.statusCode === 404) {
        return { hits: [], total: 0 };
      }
      throw error;
    }
  }

  /**
   * Calculate field occurrence counts from sampled documents
   */
  private calculateFieldOccurrences(hits: SearchHit[]): Map<string, FieldOccurrence> {
    const occurrences = new Map<string, FieldOccurrence>();

    for (const hit of hits) {
      const flattenedDoc = getFlattenedObject(hit._source ?? {});

      for (const fieldName of Object.keys(flattenedDoc)) {
        const existing = occurrences.get(fieldName);
        if (existing) {
          existing.count++;
          // Keep a few sample values for potential type inference
          if (existing.sampleValues && existing.sampleValues.length < 5) {
            existing.sampleValues.push(flattenedDoc[fieldName]);
          }
        } else {
          occurrences.set(fieldName, {
            name: fieldName,
            count: 1,
            sampleValues: [flattenedDoc[fieldName]],
          });
        }
      }
    }

    return occurrences;
  }

  /**
   * Create field candidates from occurrence data.
   * Note: Filtering by occurrence rate happens during result generation
   * to provide transparency in the final result (all fields are reported).
   */
  private getFieldCandidates(
    occurrences: Map<string, FieldOccurrence>,
    totalDocs: number,
    existingFields: FieldDefinition
  ): FieldCandidate[] {
    const candidates: FieldCandidate[] = [];

    for (const [name, occurrence] of occurrences) {
      const occurrenceRate = occurrence.count / totalDocs;
      const existingField = existingFields[name];

      candidates.push({
        name,
        occurrenceRate,
        existingType: existingField?.type as FieldDefinitionType | 'system' | undefined,
      });
    }

    return candidates;
  }

  /**
   * Enrich candidates with metadata from fields metadata service (ECS/OTEL)
   */
  private async enrichWithMetadata(candidates: FieldCandidate[]): Promise<FieldCandidate[]> {
    const fieldNames = candidates.map((c) => c.name);

    if (fieldNames.length === 0) {
      return candidates;
    }

    let fieldMetadataMap: Record<string, FieldMetadataPlain>;
    try {
      fieldMetadataMap = (
        await this.deps.fieldsMetadataClient.find({
          fieldNames,
        })
      ).toPlain();
    } catch (error) {
      // Gracefully handle metadata service failures
      fieldMetadataMap = {};
    }

    for (const candidate of candidates) {
      const metadata = fieldMetadataMap[candidate.name];
      if (metadata) {
        if (
          metadata.type &&
          FIELD_DEFINITION_TYPES.includes(metadata.type as FieldDefinitionType)
        ) {
          candidate.suggestedType = metadata.type as FieldDefinitionType;
          candidate.source = metadata.source as TypeSource;
          candidate.description = metadata.description;
        }
      }
    }

    return candidates;
  }

  /**
   * Get ES field capabilities for the stream
   */
  private async getFieldCapabilities(
    streamName: string
  ): Promise<Record<string, Record<string, unknown>>> {
    try {
      const response = await this.deps.scopedClusterClient.asCurrentUser.fieldCaps({
        index: streamName,
        fields: '*',
      });
      return response.fields;
    } catch (error) {
      // If field caps fails, return empty
      return {};
    }
  }

  /**
   * Enrich candidates with ES field capabilities
   */
  private enrichWithFieldCaps(
    candidates: FieldCandidate[],
    fieldCaps: Record<string, Record<string, unknown>>
  ): void {
    for (const candidate of candidates) {
      const caps = fieldCaps[candidate.name];
      if (caps) {
        const esTypes = Object.keys(caps);
        if (esTypes.length > 0) {
          candidate.esType = esTypes[0];

          // If no suggested type from metadata, try to use ES type
          if (!candidate.suggestedType && candidate.esType) {
            if (FIELD_DEFINITION_TYPES.includes(candidate.esType as FieldDefinitionType)) {
              candidate.suggestedType = candidate.esType as FieldDefinitionType;
              candidate.source = 'es_field_caps';
            }
          }
        }
      }
    }
  }

  /**
   * Generate final field results with status and reasons
   */
  private generateFieldResults(
    candidates: FieldCandidate[],
    existingFields: FieldDefinition,
    minOccurrenceRate: number
  ): MappingSuggestionFieldResult[] {
    const results: MappingSuggestionFieldResult[] = [];

    for (const candidate of candidates) {
      const result: MappingSuggestionFieldResult = {
        name: candidate.name,
        status: 'skipped',
        occurrenceRate: candidate.occurrenceRate,
      };

      // Check skip conditions in order of priority
      const skipReason = this.determineSkipReason(candidate, existingFields, minOccurrenceRate);

      if (skipReason) {
        result.reason = skipReason;
        result.status = 'skipped';
      } else if (candidate.suggestedType) {
        result.status = 'mapped';
        result.type = candidate.suggestedType;
        result.source = candidate.source;
        result.description = candidate.description;
      } else {
        result.reason = 'no_type_available';
        result.status = 'skipped';
      }

      results.push(result);
    }

    return results;
  }

  /**
   * Determine if and why a field should be skipped.
   * Skip conditions are checked in a deterministic order of priority.
   */
  private determineSkipReason(
    candidate: FieldCandidate,
    existingFields: FieldDefinition,
    minOccurrenceRate: number
  ): SkipReason | undefined {
    // 1. Check if it's a system field (highest priority - always skip)
    if (candidate.existingType === 'system') {
      return 'system_field';
    }

    // 2. Check for low occurrence rate (fields appearing rarely should not be mapped)
    if (candidate.occurrenceRate < minOccurrenceRate) {
      return 'low_occurrence_rate';
    }

    // 3. Check if field already has a mapping in the stream definition
    const existingField = existingFields[candidate.name];
    if (existingField) {
      // If it's a system field in the existing fields, skip
      if (existingField.type === 'system') {
        return 'system_field';
      }

      // If there's an existing mapping with different type, it's a conflict
      if (candidate.suggestedType && existingField.type !== candidate.suggestedType) {
        return 'existing_mapping_conflict';
      }

      // Even if types match, skip since it's already mapped (preserve user definitions)
      return 'existing_mapping_present';
    }

    // 4. Check for unsupported ES type when no metadata type is available
    if (
      candidate.esType &&
      !FIELD_DEFINITION_TYPES.includes(candidate.esType as FieldDefinitionType)
    ) {
      if (!candidate.suggestedType) {
        return 'unsupported_type';
      }
    }

    return undefined;
  }

  /**
   * Build the mapping definitions for fields that should be applied
   */
  private buildAppliedMappings(
    fieldResults: MappingSuggestionFieldResult[]
  ): Record<string, FieldDefinitionConfig> {
    const mappings: Record<string, FieldDefinitionConfig> = {};

    for (const result of fieldResults) {
      if (result.status === 'mapped' && result.type) {
        mappings[result.name] = { type: result.type };
      }
    }

    return mappings;
  }

  /**
   * Calculate aggregate statistics
   */
  private calculateStats(fieldResults: MappingSuggestionFieldResult[]): MappingSuggestionStats {
    let mappedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const result of fieldResults) {
      if (result.status === 'mapped') {
        mappedCount++;
      } else {
        skippedCount++;
      }
      if (result.error) {
        errorCount++;
      }
    }

    return {
      totalFields: fieldResults.length,
      mappedCount,
      skippedCount,
      errorCount,
    };
  }

  /**
   * Create an empty result for streams with no sample data
   */
  private createEmptyResult(streamName: string, applied: boolean): MappingSuggestionResult {
    return {
      streamName,
      applied,
      fields: [],
      stats: {
        totalFields: 0,
        mappedCount: 0,
        skippedCount: 0,
        errorCount: 0,
      },
      appliedMappings: {},
      timestamp: new Date().toISOString(),
    };
  }
}
