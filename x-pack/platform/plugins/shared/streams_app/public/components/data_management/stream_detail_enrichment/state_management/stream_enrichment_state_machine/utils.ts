/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldDefinition, Streams } from '@kbn/streams-schema';
import { StreamEnrichmentContextType } from './types';
import {
  convertToFieldDefinition,
  getMappedSchemaFields,
  getUnmappedSchemaFields,
} from '../simulation_state_machine';

export function getStagedProcessors(context: StreamEnrichmentContextType) {
  return context.processorsRefs
    .map((proc) => proc.getSnapshot())
    .filter((proc) => proc.context.isNew)
    .map((proc) => proc.context.processor);
}

export function getConfiguredProcessors(context: StreamEnrichmentContextType) {
  return context.processorsRefs
    .map((proc) => proc.getSnapshot())
    .filter((proc) => proc.matches('configured'))
    .map((proc) => proc.context.processor);
}

export function getUpsertWiredFields(
  context: StreamEnrichmentContextType
): FieldDefinition | undefined {
  if (!Streams.WiredStream.GetResponse.is(context.definition) || !context.simulatorRef) {
    return undefined;
  }

  const originalFieldDefinition = { ...context.definition.stream.ingest.wired.fields };

  const { detectedSchemaFields } = context.simulatorRef.getSnapshot().context;

  // Remove unmapped fields from original definition
  const unmappedSchemaFields = getUnmappedSchemaFields(detectedSchemaFields);
  unmappedSchemaFields.forEach((field) => {
    delete originalFieldDefinition[field.name];
  });

  const mappedSchemaFields = getMappedSchemaFields(detectedSchemaFields).filter(
    (field) => !originalFieldDefinition[field.name]
  );

  const simulationMappedFieldDefinition = convertToFieldDefinition(mappedSchemaFields);

  return { ...originalFieldDefinition, ...simulationMappedFieldDefinition };
}
