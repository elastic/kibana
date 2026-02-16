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
      const ancestorField = ancestor.ingest.wired.fields[fieldName];
      if (ancestorField) {
        const fieldType = fields[fieldName].type;
        // Prevent setting type: 'unmapped' on a field that is mapped in the parent
        // This would be misleading as it suggests the field can be unmapped, but
        // the parent's mapping still applies
        if (
          fieldType === 'unmapped' &&
          ancestorField.type !== 'unmapped' &&
          ancestorField.type !== 'system'
        ) {
          throw new MalformedFieldsError(
            `Field ${fieldName} cannot be set to 'unmapped' because it is mapped in the parent stream ${ancestor.name}. ` +
              `To add a description, omit the type or use the same type as the parent.`
          );
        }
        // Check for incompatible type changes (different non-unmapped types)
        // Allow: parent has 'unmapped' type → child can set any type (this is the expected use case
        // where a field is documented in a parent but mapped in a child)
        if (
          fieldType !== undefined &&
          ancestorField.type !== fieldType &&
          ancestorField.type !== 'unmapped'
        ) {
          throw new MalformedFieldsError(
            `Field ${fieldName} is already defined with incompatible type in the parent stream ${ancestor.name}`
          );
        }
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
      const fieldType = fields[fieldName].type;
      if (
        Object.hasOwn(fields, fieldName) &&
        fieldType !== undefined &&
        Object.entries(descendant.ingest.wired.fields).some(
          ([descendantFieldName, attr]) =>
            descendantFieldName === fieldName && attr.type !== undefined && attr.type !== fieldType
        )
      ) {
        throw new MalformedFieldsError(
          `Field ${fieldName} is already defined with incompatible type in the child stream ${descendant.name}`
        );
      }
    }
  }
}
