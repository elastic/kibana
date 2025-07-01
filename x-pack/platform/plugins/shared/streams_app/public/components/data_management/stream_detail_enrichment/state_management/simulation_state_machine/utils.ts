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

export function getSourceFields(processors: ProcessorDefinitionWithUIAttributes[]): string[] {
  return processors
    .map((processor) => {
      const config = getProcessorConfig(processor);
      if ('field' in config) {
        return config.field.trim();
      }
      return '';
    })
    .filter(Boolean);
}

export function getTableColumns(
  processors: ProcessorDefinitionWithUIAttributes[],
  fields: DetectedField[],
  filter: PreviewDocsFilterOption
) {
  const uniqueProcessorsFields = uniq(getSourceFields(processors));

  if (filter === 'outcome_filter_failed' || filter === 'outcome_filter_skipped') {
    return uniqueProcessorsFields;
  }

  const uniqueDetectedFields = uniq(fields.map((field) => field.name));

  return uniq([...uniqueProcessorsFields, ...uniqueDetectedFields]);
}

export function filterSimulationDocuments(
  documents: Simulation['documents'],
  filter: PreviewDocsFilterOption
) {
  switch (filter) {
    case 'outcome_filter_parsed':
      return documents.filter((doc) => doc.status === 'parsed').map((doc) => doc.value);
    case 'outcome_filter_partially_parsed':
      return documents.filter((doc) => doc.status === 'partially_parsed').map((doc) => doc.value);
    case 'outcome_filter_skipped':
      return documents.filter((doc) => doc.status === 'skipped').map((doc) => doc.value);
    case 'outcome_filter_failed':
      return documents.filter((doc) => doc.status === 'failed').map((doc) => doc.value);
    case 'outcome_filter_all':
    default:
      return documents.map((doc) => doc.value);
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
