/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldDefinition, FlattenRecord } from '@kbn/streams-schema';
import { uniq } from 'lodash';
import type { StreamlangProcessorDefinitionWithUIAttributes } from '@kbn/streamlang';
import type { PreviewDocsFilterOption } from './simulation_documents_search';
import type { DetectedField, Simulation, SimulationContext } from './types';
import type { MappedSchemaField, SchemaField } from '../../../schema_editor/types';
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

  const schemaFields: SchemaField[] = detectedFields.map((field) => {
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

    // Detected field already inherited
    if ('from' in field) {
      fieldSchema = {
        ...field,
        status: 'inherited',
        parent: field.from,
      };
    }
    // Detected field already mapped
    else if ('type' in field) {
      fieldSchema = {
        ...field,
        status: 'mapped',
        parent: streamName,
      };
    }

    updatedCache.set(fieldSchema.name, fieldSchema);
    return fieldSchema;
  });

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

    const schemaField: SchemaField = { ...field, status: 'unmapped' };
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
