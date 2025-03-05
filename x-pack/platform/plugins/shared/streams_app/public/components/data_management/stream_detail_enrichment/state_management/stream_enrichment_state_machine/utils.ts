/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldDefinition, isWiredStreamGetResponse } from '@kbn/streams-schema';
import { StreamEnrichmentContext } from './types';
import { convertToFieldDefinitionConfig } from '../../../schema_editor/utils';
import { isSchemaFieldTyped } from '../../../schema_editor/types';

export function getStagedProcessors(context: StreamEnrichmentContext) {
  return context.processorsRefs
    .map((proc) => proc.getSnapshot())
    .filter((proc) => proc.context.isNew)
    .map((proc) => proc.context.processor);
}

export function getConfiguredProcessors(context: StreamEnrichmentContext) {
  return context.processorsRefs
    .map((proc) => proc.getSnapshot())
    .filter((proc) => proc.matches('configured'))
    .map((proc) => proc.context.processor);
}

export function getMappedFields(context: StreamEnrichmentContext): FieldDefinition | undefined {
  if (!isWiredStreamGetResponse(context.definition) || !context.simulatorRef) {
    return undefined;
  }

  const originalFieldDefinition = context.definition.stream.ingest.wired.fields;

  const simulationMappedFieldDefinition: FieldDefinition = context.simulatorRef
    .getSnapshot()
    .context.detectedSchemaFields.filter(isSchemaFieldTyped)
    .filter((field) => field.status === 'mapped' && !originalFieldDefinition[field.name])
    .reduce(
      (mappedFields, field) =>
        Object.assign(mappedFields, { [field.name]: convertToFieldDefinitionConfig(field) }),
      {}
    );

  return { ...originalFieldDefinition, ...simulationMappedFieldDefinition };
}
