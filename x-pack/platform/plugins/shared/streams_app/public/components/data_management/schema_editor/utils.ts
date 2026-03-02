/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ClassicFieldDefinitionConfig, FieldDefinitionConfig } from '@kbn/streams-schema';
import { Streams } from '@kbn/streams-schema';
import { isEqual, omit } from 'lodash';
import type { IngestUpsertRequest } from '@kbn/streams-schema/src/models/ingest';
import type { MappedSchemaField, SchemaEditorField, SchemaField } from './types';

export const getGeoPointSuggestion = ({
  fieldName,
  fields,
  streamType,
}: {
  fieldName: string;
  fields?: SchemaEditorField[];
  streamType: 'classic' | 'wired';
}) => {
  if (streamType !== 'classic' || !fields) {
    return null;
  }

  const match = fieldName.match(/^(.*)\.(lat|lon)$/);
  if (!match) {
    return null;
  }

  const baseName = match[1];
  const suffix = match[2];
  const siblingSuffix = suffix === 'lat' ? 'lon' : 'lat';
  const siblingName = `${baseName}.${siblingSuffix}`;

  const siblingExists = fields.some((f) => f.name === siblingName && f.status === 'unmapped');
  const baseExistsAsGeoPoint = fields.some(
    (f) => f.name === baseName && f.type === 'geo_point' && f.status === 'mapped'
  );

  if (siblingExists && !baseExistsAsGeoPoint) {
    return { base: baseName };
  }

  return null;
};

export const convertToFieldDefinitionConfig = (field: MappedSchemaField): FieldDefinitionConfig => {
  if (field.type === 'system') {
    // `system` is a UI-only pseudo-type and must never be persisted in a stream definition.
    throw new Error('Cannot convert system-managed field type to FieldDefinitionConfig');
  }

  return {
    type: field.type,
    ...(field.format && field.type === 'date' ? { format: field.format as string } : {}),
    ...(field.description ? { description: field.description } : {}),
    ...(field.additionalParameters && Object.keys(field.additionalParameters).length > 0
      ? field.additionalParameters
      : {}),
  } as FieldDefinitionConfig;
};

export function isFieldUncommitted(field: SchemaEditorField, storedFields: SchemaEditorField[]) {
  const fieldDefaults = {
    format: undefined,
    description: undefined,
    additionalParameters: {},
  };
  // Check if field is new (not in stored fields)
  const storedField = storedFields.find((stored) => stored.name === field.name);
  if (!storedField) {
    // If the field is not stored yet and is still unmapped without a description,
    // then we didn't touch it and it is not uncommitted.
    // However, an unmapped field with a description is a doc-only override that needs saving.
    if (field.status === 'unmapped') {
      return Boolean(field.description && field.description.trim().length > 0);
    }
    return true;
  }

  // Create copies without SchemaEditorField-specific properties (result, uncommitted)
  // to compare only the base SchemaField properties
  const { result: _fieldResult, uncommitted: _fieldUncommitted, ...fieldToCompare } = field;
  const {
    result: _storedResult,
    uncommitted: _storedUncommitted,
    ...storedToCompare
  } = storedField;

  // Check if field has been modified (different from stored)
  return !isEqual(
    { ...fieldDefaults, ...storedToCompare },
    { ...fieldDefaults, ...fieldToCompare }
  );
}

export const buildSchemaSavePayload = (
  definition: Streams.ingest.all.GetResponse,
  fields: SchemaField[]
): { ingest: IngestUpsertRequest } => {
  const isWired = Streams.WiredStream.GetResponse.is(definition);

  // For wired streams, get inherited field descriptions to detect doc-only overrides
  const inheritedDescriptions = new Map<string, string | undefined>();
  if (isWired) {
    for (const [name, inheritedField] of Object.entries(definition.inherited_fields)) {
      inheritedDescriptions.set(
        name,
        'description' in inheritedField ? inheritedField.description : undefined
      );
    }
  }

  const persistedFields = fields.reduce((acc, field) => {
    const hasNonEmptyDescription = Boolean(
      field.description && field.description.trim().length > 0
    );

    // Persist:
    // - mapped fields (real overrides)
    // - doc-only overrides (description-only), even if status is 'unmapped' (wired streams only)
    // - inherited fields with description overrides defined on THIS stream (wired streams only)
    if (field.status === 'mapped') {
      // UI-only pseudo-type; never persist.
      if (field.type === 'system') {
        return acc;
      }
      acc[field.name] = convertToFieldDefinitionConfig(field as MappedSchemaField);
    } else if (field.status === 'unmapped' && hasNonEmptyDescription && isWired) {
      // Classic streams don't support description-only field overrides
      acc[field.name] = { description: field.description!.trim() };
    } else if (field.status === 'inherited' && hasNonEmptyDescription && isWired) {
      // For inherited fields, check if the description differs from the inherited one.
      // If so, it's a doc-only override defined on this stream that needs to be preserved.
      const inheritedDescription = inheritedDescriptions.get(field.name);
      if (field.description !== inheritedDescription) {
        acc[field.name] = { description: field.description!.trim() };
      }
    }

    return acc;
  }, {} as Record<string, FieldDefinitionConfig>);

  return {
    ingest: {
      ...definition.stream.ingest,
      processing: omit(definition.stream.ingest.processing, 'updated_at'),
      ...(isWired
        ? {
            wired: {
              ...definition.stream.ingest.wired,
              fields: persistedFields,
            },
          }
        : {
            classic: {
              ...definition.stream.ingest.classic,
              // Safe cast: we only add description-only fields for wired streams,
              // so classic fields will always have a type
              field_overrides: persistedFields as Record<string, ClassicFieldDefinitionConfig>,
            },
          }),
    },
  };
};
