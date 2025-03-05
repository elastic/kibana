/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isWiredStreamGetResponse } from '@kbn/streams-schema';
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

// const mergeFields = (
//   definition: WiredStreamGetResponse,
//   currentFields: FieldDefinition,
//   newFields: DetectedField[]
// ) => {
//   return {
//     ...definition.stream.ingest.wired.fields,
//     ...newFields.reduce((acc, field) => {
//       // Add only new fields and ignore unmapped ones
//       if (
//         !(field.name in currentFields) &&
//         !(field.name in definition.inherited_fields) &&
//         field.type !== undefined
//       ) {
//         acc[field.name] = { type: field.type };
//       }
//       return acc;
//     }, {} as FieldDefinition),
//   };
// };

export function getMappedFields(context: StreamEnrichmentContext) {
  if (!isWiredStreamGetResponse(context.definition) || !context.simulatorRef) {
    return undefined;
  }

  const originalFields = context.definition.stream.ingest.wired.fields;

  const simulationMappedFields = context.simulatorRef
    .getSnapshot()
    .context.detectedSchemaFields.filter(isSchemaFieldTyped)
    .filter((field) => field.status === 'mapped' && !originalFields[field.name])
    .map((field) => ({ [field.name]: convertToFieldDefinitionConfig(field) }));

  return { ...originalFields, ...simulationMappedFields };
}
