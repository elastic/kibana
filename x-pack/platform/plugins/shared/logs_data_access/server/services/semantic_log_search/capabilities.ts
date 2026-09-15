/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import {
  getIndexMappings,
  flattenMapping,
  type MappingField,
} from '@kbn/agent-builder-genai-utils';
import { resolveDefaultInferenceIdFromInferenceGet } from '@kbn/product-doc-common';

/**
 * Information about a semantic_text field including its inference endpoint.
 */
export interface SemanticTextField {
  field: string;
  inferenceId: string;
}

/**
 * Information about a pattern_text field.
 * pattern_text automatically creates subfields: .template, .template_id, .args
 */
export interface PatternTextField {
  field: string;
  /** The subfield containing the template hash, e.g. "message.template_id" */
  templateIdField: string;
}

/**
 * Target capabilities for semantic log search.
 *
 * The capability ladder (from best to fallback):
 * 1. semantic_text + pattern_text: semantic ranking with exact template resolution
 * 2. semantic_text only: semantic ranking with approximate resolution via categorize_text
 * 3. RERANK + CATEGORIZE: runtime semantic ranking via ES|QL (no pre-indexed embeddings)
 *
 * Without any semantic capability, the service returns unavailable.
 */
export interface TargetCapabilities {
  /** All fields from the flattened mapping */
  fields: MappingField[];
  /** Pattern text fields with their template subfields */
  patternFields: PatternTextField[];
  /** Whether the target has semantic search capability (pre-indexed embeddings) */
  hasSemanticCapability: boolean;
  /** Whether the target has exact template resolution (pattern_text) */
  hasPatternCapability: boolean;
  /** Whether the cluster has RERANK capability (runtime semantic ranking) */
  hasRerankCapability: boolean;
  /** The primary semantic field for the message (typically 'message_semantic' or 'message') */
  primarySemanticField?: SemanticTextField;
  /** The primary pattern field for the message (typically 'message') */
  primaryPatternField?: PatternTextField;
}

/**
 * Extract semantic_text field information from a mapping property.
 */
function extractSemanticTextField(
  fieldName: string,
  property: MappingProperty
): SemanticTextField | undefined {
  if (property.type === 'semantic_text') {
    return {
      field: fieldName,
      inferenceId: property.inference_id ?? '',
    };
  }
  return undefined;
}

/**
 * Extract pattern_text field information from a mapping property.
 */
function extractPatternTextField(
  fieldName: string,
  property: MappingProperty
): PatternTextField | undefined {
  if (property.type === 'pattern_text') {
    return {
      field: fieldName,
      templateIdField: `${fieldName}.template_id`,
    };
  }
  return undefined;
}

/**
 * Recursively extract special field types from mapping properties.
 */
function extractSpecialFields(
  properties: Record<string, MappingProperty>,
  prefix = ''
): { semanticFields: SemanticTextField[]; patternFields: PatternTextField[] } {
  const semanticFields: SemanticTextField[] = [];
  const patternFields: PatternTextField[] = [];

  for (const [key, property] of Object.entries(properties)) {
    const fieldPath = prefix ? `${prefix}.${key}` : key;

    const semanticField = extractSemanticTextField(fieldPath, property);
    if (semanticField) {
      semanticFields.push(semanticField);
    }

    const patternField = extractPatternTextField(fieldPath, property);
    if (patternField) {
      patternFields.push(patternField);
    }

    // Recurse into nested properties
    if ('properties' in property && property.properties) {
      const nested = extractSpecialFields(
        property.properties as Record<string, MappingProperty>,
        fieldPath
      );
      semanticFields.push(...nested.semanticFields);
      patternFields.push(...nested.patternFields);
    }

    // Recurse into multi-fields
    if ('fields' in property && property.fields) {
      const nested = extractSpecialFields(
        property.fields as Record<string, MappingProperty>,
        fieldPath
      );
      semanticFields.push(...nested.semanticFields);
      patternFields.push(...nested.patternFields);
    }
  }

  return { semanticFields, patternFields };
}

/**
 * Detect capabilities for a target index/data stream/pattern.
 *
 * Inspects the mappings to find:
 * - semantic_text fields with their inference_id
 * - pattern_text fields with their template subfields
 *
 * Identifies the primary fields for message searching (looks for 'message' or common variants).
 */
export async function detectCapabilities(
  esClient: ElasticsearchClient,
  target: string
): Promise<TargetCapabilities> {
  // Resolve target to concrete indices
  const resolveResponse = await esClient.indices.resolveIndex({ name: target });
  const concreteIndices = [
    ...resolveResponse.indices.map((i) => i.name),
    ...resolveResponse.data_streams.flatMap((ds) => ds.backing_indices),
  ];

  if (concreteIndices.length === 0) {
    return {
      fields: [],
      patternFields: [],
      hasSemanticCapability: false,
      hasPatternCapability: false,
      hasRerankCapability: false,
    };
  }

  // Get mappings for all concrete indices
  const mappings = await getIndexMappings({
    indices: concreteIndices,
    cleanup: false, // We need the raw mappings to extract inference_id
    esClient,
  });

  // Aggregate fields and special fields across all indices
  const allFields: MappingField[] = [];
  const allSemanticFields: SemanticTextField[] = [];
  const allPatternFields: PatternTextField[] = [];
  const seenFieldPaths = new Set<string>();
  const seenSemanticPaths = new Set<string>();
  const seenPatternPaths = new Set<string>();

  for (const [_indexName, { mappings: indexMappings }] of Object.entries(mappings)) {
    // Flatten for general field info
    const flatFields = flattenMapping(indexMappings);
    for (const field of flatFields) {
      if (!seenFieldPaths.has(field.path)) {
        seenFieldPaths.add(field.path);
        allFields.push(field);
      }
    }

    // Extract special fields from raw mappings
    if (indexMappings.properties) {
      const { semanticFields, patternFields } = extractSpecialFields(
        indexMappings.properties as Record<string, MappingProperty>
      );

      for (const sf of semanticFields) {
        if (!seenSemanticPaths.has(sf.field)) {
          seenSemanticPaths.add(sf.field);
          allSemanticFields.push(sf);
        }
      }

      for (const pf of patternFields) {
        if (!seenPatternPaths.has(pf.field)) {
          seenPatternPaths.add(pf.field);
          allPatternFields.push(pf);
        }
      }
    }
  }

  // Find primary fields (prefer 'message' or 'message_semantic')
  const primarySemanticField =
    allSemanticFields.find((f) => f.field === 'message_semantic') ||
    allSemanticFields.find((f) => f.field === 'message') ||
    allSemanticFields[0];

  const primaryPatternField =
    allPatternFields.find((f) => f.field === 'message') || allPatternFields[0];

  return {
    fields: allFields,
    patternFields: allPatternFields,
    hasSemanticCapability: allSemanticFields.length > 0,
    hasPatternCapability: allPatternFields.length > 0,
    hasRerankCapability: false, // Set by detectRerankCapability separately
    primarySemanticField,
    primaryPatternField,
  };
}

/** The default rerank inference endpoint available in ES 9.3+ */
const RERANK_ENDPOINT = '.rerank-v1-elasticsearch';

/**
 * Detect if the cluster has RERANK capability.
 *
 * Checks if the default rerank endpoint (.rerank-v1-elasticsearch) is available.
 * This endpoint is preconfigured in ES 9.3+ and enables runtime semantic ranking
 * via ES|QL RERANK command.
 */
export async function detectRerankCapability(esClient: ElasticsearchClient): Promise<boolean> {
  try {
    const response = await esClient.inference.get({ inference_id: RERANK_ENDPOINT });
    return (response.endpoints?.length ?? 0) > 0;
  } catch {
    // Endpoint doesn't exist or inference API not available
    return false;
  }
}

/**
 * Resolve the default inference endpoint ID.
 *
 * Priority: Jina v5 > EIS ELSER > local ELSER
 *
 * This is used when the target doesn't have a semantic_text field with an explicit
 * inference_id, or when we need to verify the endpoint still exists.
 */
export async function resolveDefaultInferenceEndpoint(
  esClient: ElasticsearchClient
): Promise<string> {
  return resolveDefaultInferenceIdFromInferenceGet(async () => {
    const response = await esClient.inference.get({});
    return { endpoints: response.endpoints };
  });
}
