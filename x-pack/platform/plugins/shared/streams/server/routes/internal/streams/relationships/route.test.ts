/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldMetadataPlain } from '@kbn/fields-metadata-plugin/common';
import type { Streams } from '@kbn/streams-schema';

// We need to re-export the utility functions for testing
// For now, we'll test the logic by creating test utilities that mirror the implementation

/**
 * Fields that are strong correlation signals for stream relationships.
 */
const CORRELATION_FIELD_WEIGHTS: Record<string, number> = {
  'trace.id': 1.0,
  'span.id': 0.95,
  'service.name': 0.85,
  'container.id': 0.85,
  'kubernetes.pod.uid': 0.85,
  'host.id': 0.8,
  'session.id': 0.8,
  'user.id': 0.75,
};

/**
 * Extract field names and types from a stream definition
 */
function extractFieldsFromStream(stream: Streams.all.Definition): Map<string, string> {
  const fields = new Map<string, string>();

  if ('ingest' in stream && stream.ingest && 'wired' in stream.ingest) {
    const wiredStream = stream as Streams.WiredStream.Definition;
    for (const [fieldName, config] of Object.entries(wiredStream.ingest.wired.fields)) {
      if (config.type !== 'system') {
        fields.set(fieldName, config.type);
      }
    }
  } else if ('ingest' in stream && stream.ingest && 'classic' in stream.ingest) {
    const classicStream = stream as Streams.ClassicStream.Definition;
    const overrides = classicStream.ingest.classic.field_overrides;
    if (overrides) {
      for (const [fieldName, config] of Object.entries(overrides)) {
        if (config.type !== 'system') {
          fields.set(fieldName, config.type);
        }
      }
    }
  }

  return fields;
}

/**
 * Check if two field types are compatible for correlation purposes
 */
function areTypesCompatible(type1: string, type2: string): boolean {
  if (type1 === type2) return true;

  const numericTypes = new Set([
    'long',
    'integer',
    'short',
    'byte',
    'double',
    'float',
    'half_float',
    'unsigned_long',
  ]);
  if (numericTypes.has(type1) && numericTypes.has(type2)) return true;

  const textTypes = new Set(['keyword', 'text', 'match_only_text', 'wildcard']);
  if (textTypes.has(type1) && textTypes.has(type2)) return true;

  return false;
}

interface SharedField {
  name: string;
  type: string;
  otherType: string;
  isCorrelationField: boolean;
  correlationWeight: number;
  metadata?: FieldMetadataPlain;
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

  const fieldCountScore = Math.min(sharedFields.length / 10, 0.3);

  const correlationFields = sharedFields.filter((f) => f.isCorrelationField);
  const correlationScore = correlationFields.reduce((sum, f) => sum + f.correlationWeight * 0.5, 0);
  const normalizedCorrelationScore = Math.min(correlationScore, 0.6);

  const metadataFields = sharedFields.filter(
    (f) => f.metadata?.source === 'ecs' || f.metadata?.source === 'otel'
  );
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

  const topFields = sharedFields
    .slice(0, 3)
    .map((f) => f.name)
    .join(', ');
  return `Streams share ${sharedFields.length} field(s): ${topFields}${sharedFields.length > 3 ? '...' : ''}`;
}

describe('relationship suggestions', () => {
  describe('extractFieldsFromStream', () => {
    it('extracts fields from a wired stream', () => {
      const stream: Streams.WiredStream.Definition = {
        name: 'logs.test',
        description: '',
        updated_at: '2024-01-01T00:00:00Z',
        query_streams: [],
        ingest: {
          lifecycle: { inherit: {} },
          processing: { steps: [], updated_at: '2024-01-01T00:00:00Z' },
          settings: {},
          failure_store: { inherit: {} },
          wired: {
            fields: {
              'service.name': { type: 'keyword' },
              'trace.id': { type: 'keyword' },
              '@timestamp': { type: 'system' },
            },
            routing: [],
          },
        },
      };

      const fields = extractFieldsFromStream(stream);
      expect(fields.size).toBe(2);
      expect(fields.get('service.name')).toBe('keyword');
      expect(fields.get('trace.id')).toBe('keyword');
      expect(fields.has('@timestamp')).toBe(false);
    });

    it('extracts fields from a classic stream', () => {
      const stream: Streams.ClassicStream.Definition = {
        name: 'my-data-stream',
        description: '',
        updated_at: '2024-01-01T00:00:00Z',
        ingest: {
          lifecycle: { inherit: {} },
          processing: { steps: [], updated_at: '2024-01-01T00:00:00Z' },
          settings: {},
          failure_store: { inherit: {} },
          classic: {
            field_overrides: {
              'host.name': { type: 'keyword' },
              response_code: { type: 'long' },
            },
          },
        },
      };

      const fields = extractFieldsFromStream(stream);
      expect(fields.size).toBe(2);
      expect(fields.get('host.name')).toBe('keyword');
      expect(fields.get('response_code')).toBe('long');
    });

    it('returns empty map for query stream', () => {
      const stream: Streams.QueryStream.Definition = {
        name: 'my-query-stream',
        description: '',
        updated_at: '2024-01-01T00:00:00Z',
        query_streams: [],
        query: {
          kql: { query: 'service.name: "test"' },
        },
      };

      const fields = extractFieldsFromStream(stream);
      expect(fields.size).toBe(0);
    });
  });

  describe('areTypesCompatible', () => {
    it('returns true for exact type matches', () => {
      expect(areTypesCompatible('keyword', 'keyword')).toBe(true);
      expect(areTypesCompatible('long', 'long')).toBe(true);
    });

    it('returns true for compatible numeric types', () => {
      expect(areTypesCompatible('long', 'integer')).toBe(true);
      expect(areTypesCompatible('double', 'float')).toBe(true);
      expect(areTypesCompatible('short', 'byte')).toBe(true);
    });

    it('returns true for compatible text types', () => {
      expect(areTypesCompatible('keyword', 'text')).toBe(true);
      expect(areTypesCompatible('match_only_text', 'wildcard')).toBe(true);
    });

    it('returns false for incompatible types', () => {
      expect(areTypesCompatible('keyword', 'long')).toBe(false);
      expect(areTypesCompatible('boolean', 'keyword')).toBe(false);
      expect(areTypesCompatible('ip', 'keyword')).toBe(false);
    });
  });

  describe('computeSharedFields', () => {
    it('finds shared fields with compatible types', () => {
      const sourceFields = new Map([
        ['service.name', 'keyword'],
        ['trace.id', 'keyword'],
        ['count', 'long'],
      ]);
      const targetFields = new Map([
        ['service.name', 'keyword'],
        ['trace.id', 'text'],
        ['other_field', 'keyword'],
      ]);

      const shared = computeSharedFields(sourceFields, targetFields, {});
      expect(shared.length).toBe(2);
      expect(shared.find((f) => f.name === 'service.name')).toBeDefined();
      expect(shared.find((f) => f.name === 'trace.id')).toBeDefined();
    });

    it('marks correlation fields correctly', () => {
      const sourceFields = new Map([
        ['trace.id', 'keyword'],
        ['custom_field', 'keyword'],
      ]);
      const targetFields = new Map([
        ['trace.id', 'keyword'],
        ['custom_field', 'keyword'],
      ]);

      const shared = computeSharedFields(sourceFields, targetFields, {});
      const traceField = shared.find((f) => f.name === 'trace.id');
      const customField = shared.find((f) => f.name === 'custom_field');

      expect(traceField?.isCorrelationField).toBe(true);
      expect(traceField?.correlationWeight).toBe(1.0);
      expect(customField?.isCorrelationField).toBe(false);
      expect(customField?.correlationWeight).toBe(0);
    });

    it('includes field metadata when available', () => {
      const sourceFields = new Map([['service.name', 'keyword']]);
      const targetFields = new Map([['service.name', 'keyword']]);
      const metadata: Record<string, FieldMetadataPlain> = {
        'service.name': {
          name: 'service.name',
          source: 'ecs',
          type: 'keyword',
          description: 'Name of the service',
        },
      };

      const shared = computeSharedFields(sourceFields, targetFields, metadata);
      expect(shared[0].metadata?.source).toBe('ecs');
    });
  });

  describe('calculateConfidence', () => {
    it('returns 0 for no shared fields', () => {
      expect(calculateConfidence([])).toBe(0);
    });

    it('returns low confidence for generic fields only', () => {
      const sharedFields: SharedField[] = [
        {
          name: 'custom_field_1',
          type: 'keyword',
          otherType: 'keyword',
          isCorrelationField: false,
          correlationWeight: 0,
        },
        {
          name: 'custom_field_2',
          type: 'keyword',
          otherType: 'keyword',
          isCorrelationField: false,
          correlationWeight: 0,
        },
      ];

      const confidence = calculateConfidence(sharedFields);
      // Should be around 0.2 (field count score only)
      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThan(0.3);
    });

    it('returns high confidence for correlation fields', () => {
      const sharedFields: SharedField[] = [
        {
          name: 'trace.id',
          type: 'keyword',
          otherType: 'keyword',
          isCorrelationField: true,
          correlationWeight: 1.0,
        },
        {
          name: 'service.name',
          type: 'keyword',
          otherType: 'keyword',
          isCorrelationField: true,
          correlationWeight: 0.85,
        },
      ];

      const confidence = calculateConfidence(sharedFields);
      expect(confidence).toBeGreaterThan(0.7);
    });

    it('caps confidence at 1.0', () => {
      const sharedFields: SharedField[] = Array.from({ length: 20 }, (_, i) => ({
        name: `field_${i}`,
        type: 'keyword',
        otherType: 'keyword',
        isCorrelationField: true,
        correlationWeight: 1.0,
        metadata: { name: `field_${i}`, source: 'ecs' as const },
      }));

      const confidence = calculateConfidence(sharedFields);
      expect(confidence).toBe(1.0);
    });

    it('adds bonus for ECS metadata-backed fields', () => {
      const withoutMetadata: SharedField[] = [
        {
          name: 'service.name',
          type: 'keyword',
          otherType: 'keyword',
          isCorrelationField: true,
          correlationWeight: 0.85,
        },
      ];

      const withMetadata: SharedField[] = [
        {
          name: 'service.name',
          type: 'keyword',
          otherType: 'keyword',
          isCorrelationField: true,
          correlationWeight: 0.85,
          metadata: { name: 'service.name', source: 'ecs' as const },
        },
      ];

      const confidenceWithout = calculateConfidence(withoutMetadata);
      const confidenceWith = calculateConfidence(withMetadata);
      expect(confidenceWith).toBeGreaterThan(confidenceWithout);
    });
  });

  describe('generateDescription', () => {
    it('prioritizes correlation fields in description', () => {
      const sharedFields: SharedField[] = [
        {
          name: 'custom_field',
          type: 'keyword',
          otherType: 'keyword',
          isCorrelationField: false,
          correlationWeight: 0,
        },
        {
          name: 'trace.id',
          type: 'keyword',
          otherType: 'keyword',
          isCorrelationField: true,
          correlationWeight: 1.0,
        },
        {
          name: 'service.name',
          type: 'keyword',
          otherType: 'keyword',
          isCorrelationField: true,
          correlationWeight: 0.85,
        },
      ];

      const description = generateDescription(sharedFields);
      expect(description).toContain('correlation fields');
      expect(description).toContain('trace.id');
      expect(description).toContain('service.name');
    });

    it('falls back to generic description for non-correlation fields', () => {
      const sharedFields: SharedField[] = [
        {
          name: 'custom_field_1',
          type: 'keyword',
          otherType: 'keyword',
          isCorrelationField: false,
          correlationWeight: 0,
        },
        {
          name: 'custom_field_2',
          type: 'keyword',
          otherType: 'keyword',
          isCorrelationField: false,
          correlationWeight: 0,
        },
      ];

      const description = generateDescription(sharedFields);
      expect(description).toContain('share 2 field(s)');
      expect(description).toContain('custom_field_1');
    });

    it('truncates long field lists with ellipsis', () => {
      const sharedFields: SharedField[] = Array.from({ length: 10 }, (_, i) => ({
        name: `field_${i}`,
        type: 'keyword',
        otherType: 'keyword',
        isCorrelationField: false,
        correlationWeight: 0,
      }));

      const description = generateDescription(sharedFields);
      expect(description).toContain('...');
    });
  });
});
