/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Condition, UnaryOperator, getProcessorConfig } from '@kbn/streams-schema';
import { isEmpty, uniq } from 'lodash';
import { ALWAYS_CONDITION } from '../../../../../util/condition';
import { ProcessorDefinitionWithUIAttributes } from '../../types';
import { PreviewDocsFilterOption } from './preview_docs_filter';
import { DetectedField, Simulation } from './types';
import { MappedSchemaField, SchemaField } from '../../../schema_editor/types';

export function composeSamplingCondition(
  processors: ProcessorDefinitionWithUIAttributes[]
): Condition | undefined {
  if (isEmpty(processors)) {
    return undefined;
  }

  const uniqueFields = uniq(getSourceFields(processors));

  if (isEmpty(uniqueFields)) {
    return ALWAYS_CONDITION;
  }

  const conditions = uniqueFields.map((field) => ({
    field,
    operator: 'exists' as UnaryOperator,
  }));

  return { or: conditions };
}

export function getSourceFields(processors: ProcessorDefinitionWithUIAttributes[]): string[] {
  return processors.map((processor) => getProcessorConfig(processor).field.trim()).filter(Boolean);
}

export function getTableColumns(
  processors: ProcessorDefinitionWithUIAttributes[],
  fields: DetectedField[],
  filter: PreviewDocsFilterOption
) {
  const uniqueProcessorsFields = uniq(getSourceFields(processors));

  if (filter === 'outcome_filter_unmatched') {
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
    case 'outcome_filter_matched':
      return documents.filter((doc) => doc.status === 'parsed').map((doc) => doc.value);
    case 'outcome_filter_unmatched':
      return documents.filter((doc) => doc.status !== 'parsed').map((doc) => doc.value);
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
        status: 'inherited',
        name: field.name,
        type: field.type,
        format: field.format,
        parent: field.from,
      };
    }
    // Detected field already mapped
    if ('type' in field) {
      return {
        status: 'mapped',
        name: field.name,
        type: field.type,
        format: field.format,
        parent: streamName,
      };
    }
    // Detected field still unmapped
    return {
      status: 'unmapped',
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
