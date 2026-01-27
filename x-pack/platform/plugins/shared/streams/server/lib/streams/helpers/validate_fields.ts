/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestSimulateRequest } from '@elastic/elasticsearch/lib/api/types';
import { transpileIngestPipeline } from '@kbn/streamlang';
import type { FieldDefinition, Streams } from '@kbn/streams-schema';
import { isRoot, keepFields, namespacePrefixes } from '@kbn/streams-schema';
import type { IScopedClusterClient } from '@kbn/core/server';
import { executePipelineSimulation } from '../../../routes/internal/streams/processing/simulation_handler';
import { baseMappings } from '../component_templates/logs_layer';
import { MalformedFieldsError } from '../errors/malformed_fields_error';

export function validateAncestorFields({
  ancestors,
  fields,
}: {
  ancestors: Streams.WiredStream.Definition[];
  fields: FieldDefinition;
}) {
  for (const ancestor of ancestors) {
    for (const fieldName in fields) {
      if (!Object.hasOwn(fields, fieldName)) {
        continue;
      }
      if (
        Object.entries(ancestor.ingest.wired.fields).some(
          ([ancestorFieldName, attr]) =>
            attr.type !== fields[fieldName].type && ancestorFieldName === fieldName
        )
      ) {
        throw new MalformedFieldsError(
          `Field ${fieldName} is already defined with incompatible type in the parent stream ${ancestor.name}`
        );
      }
      if (
        !namespacePrefixes.some((prefix) => fieldName.startsWith(prefix)) &&
        !keepFields.includes(fieldName)
      ) {
        throw new MalformedFieldsError(
          `Field ${fieldName} is not allowed to be defined as it doesn't match the namespaced ECS or OTel schema.`
        );
      }
      for (const prefix of namespacePrefixes) {
        const prefixedName = `${prefix}${fieldName}`;
        if (
          Object.hasOwn(fields, prefixedName) ||
          Object.hasOwn(ancestor.ingest.wired.fields, prefixedName)
        ) {
          throw new MalformedFieldsError(
            `Field ${fieldName} is an automatic alias of ${prefixedName} because of otel compat mode`
          );
        }
      }
      // check the otelMappings - they are aliases and are not allowed to have the same name as a field
      if (fieldName in baseMappings) {
        throw new MalformedFieldsError(
          `Field ${fieldName} is an automatic alias of another field because of otel compat mode`
        );
      }
    }
  }
}

export function validateSystemFields(definition: Streams.WiredStream.Definition) {
  if (isRoot(definition.name)) {
    // the root stream is allowed to have system fields
    return;
  }
  // child streams are not supposed to have system fields
  if (Object.values(definition.ingest.wired.fields).some((field) => field.type === 'system')) {
    throw new MalformedFieldsError(
      `Stream ${definition.name} is not allowed to have system fields`
    );
  }
}

export function validateClassicFields(definition: Streams.ClassicStream.Definition) {
  if (
    Object.values(definition.ingest.classic.field_overrides || {}).some(
      (field) => field.type === 'system'
    )
  ) {
    throw new MalformedFieldsError(
      `Stream ${definition.name} is not allowed to have system fields`
    );
  }
}

export async function validateSimulation(
  definition: Streams.ClassicStream.Definition | Streams.WiredStream.Definition,
  scopedClusterClient: IScopedClusterClient
) {
  if (definition.ingest.processing.steps.length === 0) {
    return;
  }

  const simulationBody: IngestSimulateRequest = {
    docs: [
      {
        _source: {},
      },
    ],
    pipeline: {
      processors: transpileIngestPipeline(definition.ingest.processing).processors,
    },
  };
  const simulationResult = await executePipelineSimulation(scopedClusterClient, simulationBody);
  if (simulationResult.status === 'failure') {
    throw new MalformedFieldsError(simulationResult.error.message);
  }
}

export function validateDescendantFields({
  descendants,
  fields,
}: {
  descendants: Streams.WiredStream.Definition[];
  fields: FieldDefinition;
}) {
  for (const descendant of descendants) {
    for (const fieldName in fields) {
      if (
        Object.hasOwn(fields, fieldName) &&
        Object.entries(descendant.ingest.wired.fields).some(
          ([descendantFieldName, attr]) =>
            attr.type !== fields[fieldName].type && descendantFieldName === fieldName
        )
      ) {
        throw new MalformedFieldsError(
          `Field ${fieldName} is already defined with incompatible type in the child stream ${descendant.name}`
        );
      }
    }
  }
}
