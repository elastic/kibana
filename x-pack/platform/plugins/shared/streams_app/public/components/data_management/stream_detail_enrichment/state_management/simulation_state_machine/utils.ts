/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldDefinition } from '@kbn/streams-schema';
import { uniq } from 'lodash';
import type { StreamlangProcessorDefinition } from '@kbn/streamlang';
import type { PreviewDocsFilterOption } from './simulation_documents_search';
import type { DetectedField, Simulation } from './types';
import type { MappedSchemaField, SchemaField } from '../../../schema_editor/types';
import { isSchemaFieldTyped } from '../../../schema_editor/types';
import { convertToFieldDefinitionConfig } from '../../../schema_editor/utils';

export function getSourceField(processor: StreamlangProcessorDefinition): string | undefined {
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
      return (doc: SimulationDocReport) => true;
  }
}

export function getSchemaFieldsFromSimulation(
  detectedFields: DetectedField[],
  previousDetectedFields: SchemaField[],
  streamName: string
) {
  const previousDetectedFieldsMap = previousDetectedFields.reduce<Record<string, SchemaField>>(
    (acc, field) => {
      acc[field.name] = field;
      return acc;
    },
    {}
  );

  const schemaFields: SchemaField[] = detectedFields.map((field) => {
    // Detected field already mapped by the user on previous simulation
    if (previousDetectedFieldsMap[field.name]) {
      return previousDetectedFieldsMap[field.name];
    }
    // Detected field already inherited
    if ('from' in field) {
      return {
        ...field,
        status: 'inherited',
        parent: field.from,
      };
    }
    // Detected field already mapped
    if ('type' in field) {
      return {
        ...field,
        status: 'mapped',
        parent: streamName,
      };
    }
    // Detected field still unmapped
    return {
      status: 'unmapped',
      esType: field.esType,
      name: field.name,
      parent: streamName,
    };
  });

  return schemaFields.sort(compareFieldsByStatus);
}

const statusOrder = { inherited: 0, mapped: 1, unmapped: 2 };
const compareFieldsByStatus = (curr: SchemaField, next: SchemaField) => {
  return statusOrder[curr.status] - statusOrder[next.status];
};

export function mapField(
  schemaFields: SchemaField[],
  updatedField: MappedSchemaField
): SchemaField[] {
  return schemaFields.map((field) => {
    if (field.name !== updatedField.name) return field;

    return { ...updatedField, status: 'mapped' };
  });
}

export function unmapField(schemaFields: SchemaField[], fieldName: string): SchemaField[] {
  return schemaFields.map((field) => {
    if (field.name !== fieldName) return field;

    return { ...field, status: 'unmapped' };
  });
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
