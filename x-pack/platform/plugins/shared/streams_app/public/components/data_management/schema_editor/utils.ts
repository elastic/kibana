/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldDefinitionConfig } from '@kbn/streams-schema';
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

export const convertToFieldDefinitionConfig = (
  field: MappedSchemaField
): FieldDefinitionConfig => ({
  type: field.type,
  ...(field.format && field.type === 'date' ? { format: field.format as string } : {}),
  ...(field.additionalParameters && Object.keys(field.additionalParameters).length > 0
    ? field.additionalParameters
    : {}),
});

export function isFieldUncommitted(field: SchemaEditorField, storedFields: SchemaEditorField[]) {
  const fieldDefaults = {
    format: undefined,
    additionalParameters: {},
  };
  // Check if field is new (not in stored fields)
  const storedField = storedFields.find((stored) => stored.name === field.name);
  if (!storedField) {
    // If the field is not stored yet and is still unmapped, then we didn't touch
    // it and it is not uncommitted, since it won't be saved to the stream definition.
    return field.status !== 'unmapped';
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
  const mappedFields = fields
    .filter((field) => field.status === 'mapped')
    .reduce((acc, field) => {
      acc[field.name] = convertToFieldDefinitionConfig(field as MappedSchemaField);
      return acc;
    }, {} as Record<string, FieldDefinitionConfig>);

  return {
    ingest: {
      ...definition.stream.ingest,
      processing: omit(definition.stream.ingest.processing, 'updated_at'),
      ...(Streams.WiredStream.GetResponse.is(definition)
        ? {
            wired: {
              ...definition.stream.ingest.wired,
              fields: mappedFields,
            },
          }
        : {
            classic: {
              ...definition.stream.ingest.classic,
              field_overrides: mappedFields,
            },
          }),
    },
  };
};
