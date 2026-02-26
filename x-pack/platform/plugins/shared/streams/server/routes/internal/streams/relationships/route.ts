/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { Relationship } from '@kbn/streams-schema';
import { relationshipSchema, Streams } from '@kbn/streams-schema';
import type {
  StorageClientDeleteResponse,
  StorageClientIndexResponse,
} from '@kbn/storage-adapter';
import type { FieldMetadataPlain } from '@kbn/fields-metadata-plugin/common';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
import { createServerRoute } from '../../../create_server_route';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { RelationshipNotFoundError } from '../../../../lib/streams/errors/relationship_not_found_error';
import type { StreamsClient } from '../../../../lib/streams/client';

export const listRelationshipsRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{name}/relationships',
  options: {
    access: 'internal',
    summary: 'List relationships for a stream',
    description: 'Fetches all relationships where the stream is either the source or target',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
  }): Promise<{ relationships: Relationship[]; total: number }> => {
    const { relationshipClient, streamsClient } = await getScopedClients({
      request,
    });

    const { name } = params.path;
    await streamsClient.ensureStream(name);

    return await relationshipClient.getRelationships(name);
  },
});

export const upsertRelationshipRoute = createServerRoute({
  endpoint: 'PUT /internal/streams/{name}/relationships',
  options: {
    access: 'internal',
    summary: 'Create or update a relationship for a stream',
    description: 'Creates or updates a relationship between two streams',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
    }),
    body: relationshipSchema,
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
  }): Promise<StorageClientIndexResponse> => {
    const { relationshipClient, streamsClient } = await getScopedClients({
      request,
    });

    const { name } = params.path;
    const { body: relationship } = params;

    // Ensure both streams in the relationship exist
    await streamsClient.ensureStream(name);
    await streamsClient.ensureStream(relationship.to_stream);

    // Validate that from_stream matches the stream name in the path
    if (relationship.from_stream !== name) {
      throw new Error(
        `from_stream (${relationship.from_stream}) must match the stream name in the path (${name})`
      );
    }

    return await relationshipClient.linkRelationship(relationship);
  },
});

export const deleteRelationshipRoute = createServerRoute({
  endpoint: 'DELETE /internal/streams/{name}/relationships/{targetStream}',
  options: {
    access: 'internal',
    summary: 'Delete a relationship between two streams',
    description: 'Removes a relationship between two streams',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
      targetStream: z.string(),
    }),
    query: z.object({
      direction: z.enum(['directional', 'bidirectional']).default('bidirectional'),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
  }): Promise<StorageClientDeleteResponse> => {
    const { relationshipClient, streamsClient } = await getScopedClients({
      request,
    });

    const { name, targetStream } = params.path;
    const { direction } = params.query;

    await streamsClient.ensureStream(name);

    try {
      return await relationshipClient.unlinkRelationship(name, targetStream, direction);
    } catch (error) {
      if (error instanceof RelationshipNotFoundError) {
        throw error;
      }
      throw error;
    }
  },
});

/**
 * Fields that are strong correlation signals for stream relationships.
 * These are ECS/OTel fields commonly used to correlate data across different sources.
 * Higher weight = stronger relationship signal.
 */
const CORRELATION_FIELD_WEIGHTS: Record<string, number> = {
  // Tracing/APM fields - strongest correlation signals
  'trace.id': 1.0,
  'span.id': 0.95,
  'transaction.id': 0.95,
  'parent.id': 0.9,

  // Service identification
  'service.name': 0.85,
  'service.namespace': 0.75,
  'service.environment': 0.7,
  'service.version': 0.6,

  // Container/infrastructure correlation
  'container.id': 0.85,
  'container.name': 0.75,
  'kubernetes.pod.uid': 0.85,
  'kubernetes.pod.name': 0.8,
  'kubernetes.namespace': 0.75,
  'kubernetes.node.name': 0.7,
  'kubernetes.deployment.name': 0.75,

  // Host identification
  'host.id': 0.8,
  'host.name': 0.75,
  'host.hostname': 0.75,

  // Cloud correlation
  'cloud.instance.id': 0.75,
  'cloud.account.id': 0.7,

  // Session/user correlation
  'session.id': 0.8,
  'user.id': 0.75,
  'user.name': 0.7,

  // Request correlation
  'http.request.id': 0.8,
  'event.id': 0.7,

  // OTel equivalents (prefixed versions)
  'resource.attributes.service.name': 0.85,
  'resource.attributes.service.namespace': 0.75,
  'attributes.service.name': 0.85,
  'resource.attributes.container.id': 0.85,
  'resource.attributes.host.name': 0.75,
  'resource.attributes.k8s.pod.uid': 0.85,
  'resource.attributes.k8s.namespace.name': 0.75,
};

/**
 * Extract field names and types from a stream definition
 */
function extractFieldsFromStream(
  stream: Streams.all.Definition
): Map<string, string> {
  const fields = new Map<string, string>();

  if (Streams.WiredStream.Definition.is(stream)) {
    for (const [fieldName, config] of Object.entries(stream.ingest.wired.fields)) {
      if (config.type !== 'system') {
        fields.set(fieldName, config.type);
      }
    }
  } else if (Streams.ClassicStream.Definition.is(stream)) {
    const overrides = stream.ingest.classic.field_overrides;
    if (overrides) {
      for (const [fieldName, config] of Object.entries(overrides)) {
        if (config.type !== 'system') {
          fields.set(fieldName, config.type);
        }
      }
    }
  }
  // QueryStream doesn't have its own fields - it references other streams

  return fields;
}

/**
 * Check if two field types are compatible for correlation purposes
 */
function areTypesCompatible(type1: string, type2: string): boolean {
  // Exact match
  if (type1 === type2) return true;

  // Numeric types are compatible with each other
  const numericTypes = new Set(['long', 'integer', 'short', 'byte', 'double', 'float', 'half_float', 'unsigned_long']);
  if (numericTypes.has(type1) && numericTypes.has(type2)) return true;

  // Text types are compatible with each other
  const textTypes = new Set(['keyword', 'text', 'match_only_text', 'wildcard']);
  if (textTypes.has(type1) && textTypes.has(type2)) return true;

  return false;
}

/**
 * Shared field information between two streams
 */
interface SharedField {
  name: string;
  type: string;
  otherType: string;
  isCorrelationField: boolean;
  correlationWeight: number;
  metadata?: FieldMetadataPlain;
}

/**
 * A suggested relationship between two streams
 */
export interface RelationshipSuggestion {
  from_stream: string;
  to_stream: string;
  confidence: number;
  shared_fields: SharedField[];
  description: string;
}

/**
 * Compute shared fields between two streams
 */
function computeSharedFields(
  sourceFields: Map<string, string>,
  targetFields: Map<string, string>,
  fieldMetadata: Record<string, FieldMetadataPlain>
): SharedField[] {
  const sharedFields: SharedField[] = [];

  for (const [fieldName, sourceType] of sourceFields) {
    const targetType = targetFields.get(fieldName);
    if (targetType && areTypesCompatible(sourceType, targetType)) {
      const correlationWeight = CORRELATION_FIELD_WEIGHTS[fieldName] ?? 0;
      sharedFields.push({
        name: fieldName,
        type: sourceType,
        otherType: targetType,
        isCorrelationField: correlationWeight > 0,
        correlationWeight,
        metadata: fieldMetadata[fieldName],
      });
    }
  }

  return sharedFields;
}

/**
 * Calculate confidence score for a relationship based on shared fields
 */
function calculateConfidence(sharedFields: SharedField[]): number {
  if (sharedFields.length === 0) return 0;

  // Base confidence from having shared fields
  const fieldCountScore = Math.min(sharedFields.length / 10, 0.3);

  // Score from correlation fields (weighted)
  const correlationFields = sharedFields.filter((f) => f.isCorrelationField);
  const correlationScore = correlationFields.reduce(
    (sum, f) => sum + f.correlationWeight * 0.5,
    0
  );
  const normalizedCorrelationScore = Math.min(correlationScore, 0.6);

  // Bonus for ECS/OTel metadata-backed fields
  const metadataFields = sharedFields.filter((f) => f.metadata?.source === 'ecs' || f.metadata?.source === 'otel');
  const metadataScore = Math.min(metadataFields.length * 0.02, 0.1);

  const totalScore = fieldCountScore + normalizedCorrelationScore + metadataScore;
  return Math.min(Math.round(totalScore * 100) / 100, 1.0);
}

/**
 * Generate a description for the suggested relationship
 */
function generateDescription(sharedFields: SharedField[]): string {
  const correlationFields = sharedFields
    .filter((f) => f.isCorrelationField)
    .sort((a, b) => b.correlationWeight - a.correlationWeight)
    .slice(0, 3);

  if (correlationFields.length > 0) {
    const fieldNames = correlationFields.map((f) => f.name).join(', ');
    return `Streams share correlation fields: ${fieldNames}`;
  }

  const topFields = sharedFields.slice(0, 3).map((f) => f.name).join(', ');
  return `Streams share ${sharedFields.length} field(s): ${topFields}${sharedFields.length > 3 ? '...' : ''}`;
}

/**
 * Get fields from all streams and return a map of stream name to fields
 */
async function getAllStreamFields(
  streamsClient: StreamsClient
): Promise<Map<string, Map<string, string>>> {
  const streams = await streamsClient.listStreams();
  const streamFieldsMap = new Map<string, Map<string, string>>();

  for (const stream of streams) {
    const fields = extractFieldsFromStream(stream);
    if (fields.size > 0) {
      streamFieldsMap.set(stream.name, fields);
    }
  }

  return streamFieldsMap;
}

/**
 * Fetch metadata for all unique field names across streams
 */
async function fetchFieldMetadataForStreams(
  fieldsMetadataClient: IFieldsMetadataClient,
  streamFieldsMap: Map<string, Map<string, string>>
): Promise<Record<string, FieldMetadataPlain>> {
  const allFieldNames = new Set<string>();
  for (const fields of streamFieldsMap.values()) {
    for (const fieldName of fields.keys()) {
      allFieldNames.add(fieldName);
    }
  }

  if (allFieldNames.size === 0) {
    return {};
  }

  try {
    const dictionary = await fieldsMetadataClient.find({
      fieldNames: Array.from(allFieldNames),
    });
    return dictionary.toPlain();
  } catch {
    // Gracefully handle metadata service failures
    return {};
  }
}

export const suggestRelationshipsRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{name}/relationships/_suggestions',
  options: {
    access: 'internal',
    summary: 'Get relationship suggestions for a stream',
    description: 'Returns suggested relationships based on shared fields with other streams',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
    }),
    query: z.object({
      min_confidence: z.coerce.number().min(0).max(1).default(0.1),
      max_suggestions: z.coerce.number().min(1).max(100).default(10),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
  }): Promise<{ suggestions: RelationshipSuggestion[] }> => {
    const { streamsClient, fieldsMetadataClient, relationshipClient } = await getScopedClients({
      request,
    });

    const { name } = params.path;
    const { min_confidence: minConfidence, max_suggestions: maxSuggestions } = params.query;

    // Ensure the source stream exists
    await streamsClient.ensureStream(name);

    // Get all stream fields
    const streamFieldsMap = await getAllStreamFields(streamsClient);

    const sourceFields = streamFieldsMap.get(name);
    if (!sourceFields || sourceFields.size === 0) {
      return { suggestions: [] };
    }

    // Fetch field metadata for enrichment
    const fieldMetadata = await fetchFieldMetadataForStreams(fieldsMetadataClient, streamFieldsMap);

    // Get existing relationships to exclude from suggestions
    const { relationships: existingRelationships } = await relationshipClient.getRelationships(name);
    const existingRelatedStreams = new Set(
      existingRelationships.flatMap((r) => [r.from_stream, r.to_stream])
    );

    // Calculate suggestions for all other streams
    const suggestions: RelationshipSuggestion[] = [];

    for (const [targetStreamName, targetFields] of streamFieldsMap) {
      // Skip self and already related streams
      if (targetStreamName === name || existingRelatedStreams.has(targetStreamName)) {
        continue;
      }

      // Skip parent-child relationships (they already have structural relationships)
      if (targetStreamName.startsWith(name + '.') || name.startsWith(targetStreamName + '.')) {
        continue;
      }

      const sharedFields = computeSharedFields(sourceFields, targetFields, fieldMetadata);
      if (sharedFields.length === 0) {
        continue;
      }

      const confidence = calculateConfidence(sharedFields);
      if (confidence < minConfidence) {
        continue;
      }

      suggestions.push({
        from_stream: name,
        to_stream: targetStreamName,
        confidence,
        shared_fields: sharedFields.sort((a, b) => b.correlationWeight - a.correlationWeight),
        description: generateDescription(sharedFields),
      });
    }

    // Sort by confidence and limit results
    suggestions.sort((a, b) => b.confidence - a.confidence);
    return { suggestions: suggestions.slice(0, maxSuggestions) };
  },
});

export const relationshipRoutes = {
  ...listRelationshipsRoute,
  ...upsertRelationshipRoute,
  ...deleteRelationshipRoute,
  ...suggestRelationshipsRoute,
};
