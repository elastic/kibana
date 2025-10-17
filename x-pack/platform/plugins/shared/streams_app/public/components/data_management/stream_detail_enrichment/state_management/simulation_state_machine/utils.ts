/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldDefinition, FlattenRecord } from '@kbn/streams-schema';
import { uniq } from 'lodash';
import type { StreamlangProcessorDefinitionWithUIAttributes } from '@kbn/streamlang';
import type { FieldDefinitionType } from '@kbn/streams-schema/src/fields';
import { FIELD_DEFINITION_TYPES } from '@kbn/streams-schema/src/fields';
import type { PreviewDocsFilterOption } from './simulation_documents_search';
import type { DetectedField, Simulation, SimulationContext } from './types';
import type {
  MappedSchemaField,
  SchemaField,
  UnmappedSchemaField,
} from '../../../schema_editor/types';
import { isSchemaFieldTyped } from '../../../schema_editor/types';
import { convertToFieldDefinitionConfig } from '../../../schema_editor/utils';

export function getSourceField(
  processor: StreamlangProcessorDefinitionWithUIAttributes
): string | undefined {
  const processorSourceField = (() => {
    switch (processor.action) {
      case 'append':
      case 'set':
        return processor.to;
      case 'rename':
      case 'grok':
      case 'dissect':
      case 'date':
        return processor.from;
      case 'manual_ingest_pipeline':
        return undefined;
      default:
        return undefined;
    }
  })();

  const trimmedSourceField = processorSourceField?.trim();
  return trimmedSourceField && trimmedSourceField.length > 0 ? trimmedSourceField : undefined;
}

export function getUniqueDetectedFields(detectedFields: DetectedField[] = []) {
  return uniq(detectedFields.map((field) => field.name));
}

export function getAllFieldsInOrder(
  previewRecords: FlattenRecord[] = [],
  detectedFields: DetectedField[] = []
): string[] {
  const fields = new Set<string>();
  previewRecords.forEach((record) => {
    Object.keys(record).forEach((key) => {
      fields.add(key);
    });
  });

  const uniqueDetectedFields = getUniqueDetectedFields(detectedFields);
  const otherFields = Array.from(fields).filter((field) => !uniqueDetectedFields.includes(field));

  return [...uniqueDetectedFields, ...otherFields.sort()];
}

export function getTableColumns({
  currentProcessorSourceField,
  detectedFields = [],
  previewDocsFilter,
}: {
  currentProcessorSourceField?: string;
  detectedFields?: DetectedField[];
  previewDocsFilter: PreviewDocsFilterOption;
}) {
  if (!currentProcessorSourceField) {
    return [];
  }

  if (['outcome_filter_failed', 'outcome_filter_skipped'].includes(previewDocsFilter)) {
    return [currentProcessorSourceField];
  }

  const uniqueDetectedFields = getUniqueDetectedFields(detectedFields);

  return uniq([currentProcessorSourceField, ...uniqueDetectedFields]);
}

type SimulationDocReport = Simulation['documents'][number];

export function getFilterSimulationDocumentsFn(filter: PreviewDocsFilterOption) {
  switch (filter) {
    case 'outcome_filter_parsed':
      return (doc: SimulationDocReport) => doc.status === 'parsed';
    case 'outcome_filter_partially_parsed':
      return (doc: SimulationDocReport) => doc.status === 'partially_parsed';
    case 'outcome_filter_skipped':
      return (doc: SimulationDocReport) => doc.status === 'skipped';
    case 'outcome_filter_failed':
      return (doc: SimulationDocReport) => doc.status === 'failed';
    case 'outcome_filter_all':
    default:
      return (_doc: SimulationDocReport) => true;
  }
}

export function getSchemaFieldsFromSimulation(context: SimulationContext): {
  detectedSchemaFields: SchemaField[];
  detectedSchemaFieldsCache: Map<string, SchemaField>;
} {
  if (!context.simulation) {
    return {
      detectedSchemaFields: context.detectedSchemaFields,
      detectedSchemaFieldsCache: context.detectedSchemaFieldsCache,
    };
  }

  const detectedFields = context.simulation.detected_fields;
  const updatedCache = new Map(context.detectedSchemaFieldsCache);
  const streamName = context.streamName;
  const streamType = context.streamType;

  const schemaFields: SchemaField[] = detectedFields
    .map((field) => {
      // Detected field already mapped by the user on previous simulation
      const cachedField = updatedCache.get(field.name);
      if (cachedField) {
        return cachedField;
      }

      // Detected field unmapped by default
      let fieldSchema: SchemaField = {
        status: 'unmapped',
        esType: field.esType,
        name: field.name,
        parent: streamName,
      };

      // Add description if available
      if ('description' in field && field.description) {
        fieldSchema.description = field.description as string;
      }

      // Add source if available (this is the metadata source like 'ecs', 'otel', etc.)
      if ('source' in field && field.source) {
        fieldSchema.source = field.source as string;
      }

      // Field Mapping Decision Tree:
      // ┌─────────────────────────────────────────────────────────────────────────────────┐
      // │ Field Processing Priority (top to bottom):                                     │
      // │                                                                                 │
      // │ 1. Inherited Fields (field.from exists)                                       │
      // │    └► status: 'inherited', parent: field.from                                │
      // │                                                                                 │
      // │ 2. ES Fields (field.esType exists)                                            │
      // │    └► status: 'mapped', retain esType, streamSource by stream type           │
      // │                                                                                 │
      // │ 3. Metadata Fields (suggestedType + source exists)                            │
      // │    ├► Classic Stream:                                                         │
      // │    │   ├► OTEL Classic Stream (name matches /^logs-.*\.otel-/):              │
      // │    │   │   ├► OTEL fields → status: 'mapped', streamSource: 'template'      │
      // │    │   │   └► All others → ignored (unmapped)                                │
      // │    │   ├► Regular Classic Stream:                                            │
      // │    │   │   ├► ECS fields → status: 'mapped', streamSource: 'template'       │
      // │    │   │   └► All others → ignored (unmapped)                                │
      // │    ├► Wired Stream:                                                          │
      // │    │   ├► OTEL fields → status: 'mapped', streamSource: 'stream'            │
      // │    │   └► All others → ignored (unmapped)                                    │
      // │    └► Unknown Stream → ECS fields only                                       │
      // │                                                                                 │
      // │ 4. User-Defined Fields (field.type exists)                                   │
      // │    └► status: 'mapped', use provided type                                    │
      // │                                                                                 │
      // │ 5. Fallback → status: 'unmapped' (unmanaged/dynamic)                         │
      // └─────────────────────────────────────────────────────────────────────────────────┘
      // Detected field already inherited
      if ('from' in field) {
        fieldSchema = {
          ...field,
          status: 'inherited',
          parent: field.from,
        };
      } else {
        const isOtelField = 'source' in field && field.source === 'otel';
        const isEcsField = 'source' in field && field.source === 'ecs';
        const hasMetadataSuggestion =
          'suggestedType' in field && field.suggestedType && 'source' in field && field.source;
        const isOtelClassicStream = streamType === 'classic' && streamName.match(/^logs-.*\.otel-/);

        // Field has ES type (already mapped in Elasticsearch)
        if (Boolean(field.esType)) {
          // Check if the ES type is supported by our FieldDefinitionType schema
          const isSupportedType = FIELD_DEFINITION_TYPES.includes(
            field.esType as FieldDefinitionType
          );

          if (isSupportedType) {
            // ES field with supported type - create as mapped field
            fieldSchema = {
              ...fieldSchema,
              status: 'mapped',
              streamSource: streamType === 'wired' ? 'stream' : 'template',
              esType: field.esType,
              type: field.esType as FieldDefinitionType,
            } as MappedSchemaField;
          } else {
            // ES field with unsupported type - create as unmapped field but still show as existing in UI
            fieldSchema = {
              ...fieldSchema,
              status: 'unmapped',
              streamSource: streamType === 'wired' ? 'stream' : 'template',
              esType: field.esType,
              // No type field set for unsupported ES types
            } as UnmappedSchemaField;
          }
        }
        // Field has metadata suggestion but no ES type - only handle ECS and OTEL fields
        else if (hasMetadataSuggestion) {
          if (streamType === 'classic') {
            // Classic streams: Handle ECS fields by default, but OTEL fields for OTEL-specific streams
            // Check if this is an OTEL-specific classic stream (e.g., logs-*.otel-*)
            const shouldMapField =
              (isOtelClassicStream && isOtelField) || (!isOtelClassicStream && isEcsField);

            if (shouldMapField) {
              fieldSchema = {
                ...fieldSchema,
                status: 'mapped',
                type: field.suggestedType as FieldDefinitionType,
                streamSource: 'template',
                // Clear esType for metadata fields to ensure proper categorization
                esType: undefined,
              } as MappedSchemaField;
            }
            // All other metadata fields are ignored for classic streams
          } else if (streamType === 'wired') {
            // Wired streams: Only handle OTEL fields, ignore everything else
            if (isOtelField) {
              fieldSchema = {
                ...fieldSchema,
                status: 'mapped',
                type: field.suggestedType as FieldDefinitionType,
                streamSource: 'stream',
                // Clear esType for metadata fields to ensure proper categorization
                esType: undefined,
              } as MappedSchemaField;
            }
          } else {
            // Unknown stream type - fall back to handling ECS fields only
            if (isEcsField) {
              fieldSchema = {
                ...fieldSchema,
                status: 'mapped',
                type: field.suggestedType as FieldDefinitionType,
                streamSource: 'template',
                // Clear esType for metadata fields to ensure proper categorization
                esType: undefined,
              } as MappedSchemaField;
            }
          }
        }
        // Field with user-defined type
        else if ('type' in field && field.type) {
          fieldSchema = {
            ...field,
            status: 'mapped',
            parent: streamName,
            type: field.type as FieldDefinitionType,
          } as MappedSchemaField;
        }
      }

      updatedCache.set(fieldSchema.name, fieldSchema);
      return fieldSchema;
    })
    .filter(Boolean);

  return {
    detectedSchemaFields: schemaFields.sort(compareFieldsByStatus),
    detectedSchemaFieldsCache: updatedCache,
  };
}

const statusOrder = { inherited: 0, mapped: 1, unmapped: 2 };
const compareFieldsByStatus = (curr: SchemaField, next: SchemaField) => {
  return statusOrder[curr.status] - statusOrder[next.status];
};

export function mapField(
  context: SimulationContext,
  updatedField: MappedSchemaField
): {
  detectedSchemaFields: SchemaField[];
  detectedSchemaFieldsCache: Map<string, SchemaField>;
} {
  const updatedCache = new Map(context.detectedSchemaFieldsCache);

  const updatedFields = context.detectedSchemaFields.map((field) => {
    if (field.name !== updatedField.name) return field;

    const schemaField: SchemaField = { ...updatedField, status: 'mapped' };
    updatedCache.set(schemaField.name, schemaField);
    return schemaField;
  });

  return {
    detectedSchemaFields: updatedFields,
    detectedSchemaFieldsCache: updatedCache,
  };
}

export function unmapField(
  context: SimulationContext,
  fieldName: string
): {
  detectedSchemaFields: SchemaField[];
  detectedSchemaFieldsCache: Map<string, SchemaField>;
} {
  const updatedCache = new Map(context.detectedSchemaFieldsCache);

  const updatedFields = context.detectedSchemaFields.map((field) => {
    if (field.name !== fieldName) return field;

    const schemaField: SchemaField = { ...field, type: undefined, status: 'unmapped' };
    updatedCache.set(schemaField.name, schemaField);
    return schemaField;
  });

  return {
    detectedSchemaFields: updatedFields,
    detectedSchemaFieldsCache: updatedCache,
  };
}

export function getMappedSchemaFields(fields: SchemaField[]) {
  return fields.filter(isSchemaFieldTyped).filter((field) => field.status === 'mapped');
}

export function getUnmappedSchemaFields(fields: SchemaField[]) {
  return fields.filter((field) => field.status === 'unmapped');
}

export function convertToFieldDefinition(fields: MappedSchemaField[]): FieldDefinition {
  return fields.reduce(
    (mappedFields, field) =>
      Object.assign(mappedFields, { [field.name]: convertToFieldDefinitionConfig(field) }),
    {}
  );
}
