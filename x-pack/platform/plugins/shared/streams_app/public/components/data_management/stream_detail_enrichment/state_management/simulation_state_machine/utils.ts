/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Condition, UnaryOperator, getProcessorConfig } from '@kbn/streams-schema';
import { isEmpty, uniq } from 'lodash';
import { ALWAYS_CONDITION } from '../../../../../util/condition';
import { ProcessorDefinitionWithUIAttributes, DetectedField } from '../../types';
import { PreviewDocsFilterOption } from './preview_docs_filter';
import { Simulation } from './types';

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
