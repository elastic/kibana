/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldDefinition, getProcessorConfig } from '@kbn/streams-schema';
import { uniq } from 'lodash';
import { ProcessorDefinitionWithUIAttributes } from '../../types';
import { PreviewDocsFilterOption } from './simulation_documents_search';
import { DetectedField, Simulation } from './types';
import { MappedSchemaField, SchemaField, isSchemaFieldTyped } from '../../../schema_editor/types';
import { convertToFieldDefinitionConfig } from '../../../schema_editor/utils';

export function getSourceField(processor: ProcessorDefinitionWithUIAttributes) {
  const config = getProcessorConfig(processor);
  if ('field' in config) {
    const trimmedField = config.field.trim();
    return trimmedField.length > 0 ? trimmedField : undefined;
  }
  return undefined;
}

export function getTableColumns({
  currentProcessor,
  detectedFields = [],
  previewDocsFilter,
  allColumns,
}: {
  currentProcessor?: ProcessorDefinitionWithUIAttributes;
  detectedFields?: DetectedField[];
  previewDocsFilter: PreviewDocsFilterOption;
  allColumns: string[];
}) {
  if (!currentProcessor) return [];

  const processorSourceField = getSourceField(currentProcessor);

  if (!processorSourceField || !allColumns.includes(processorSourceField)) {
    return [];
  }

  if (['outcome_filter_failed', 'outcome_filter_skipped'].includes(previewDocsFilter)) {
    return [processorSourceField];
  }

  const uniqueDetectedFields = uniq(detectedFields.map((field) => field.name));

  return uniq([processorSourceField, ...uniqueDetectedFields]);
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
