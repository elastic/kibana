/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldDefinition } from '@kbn/streams-schema';
import type { IngestUpsertRequest } from '@kbn/streams-schema/src/models/ingest';
import { WiredIngestUpsertRequest } from '@kbn/streams-schema/src/models/ingest/wired';
import type { ClassicIngestUpsertRequest } from '@kbn/streams-schema/src/models/ingest/classic';

const getFieldsWithUnmappedType = (fields: FieldDefinition | undefined): string[] => {
  if (!fields) {
    return [];
  }

  return Object.entries(fields)
    .filter(([, config]) => config.type === 'unmapped')
    .map(([name]) => name);
};

/**
 * Returns field names that have a description but no type (typeless description-only overrides).
 * For classic streams, these are not allowed - users must specify a type to add a description.
 */
const getTypelessDescriptionFields = (fields: FieldDefinition | undefined): string[] => {
  if (!fields) {
    return [];
  }

  return Object.entries(fields)
    .filter(([, config]) => !config.type && config.description)
    .map(([name]) => name);
};

export const getUnmappedFieldsFromIngestUpsert = (ingest: IngestUpsertRequest): string[] => {
  if (WiredIngestUpsertRequest.is(ingest)) {
    return getFieldsWithUnmappedType(ingest.wired.fields);
  }

  return getFieldsWithUnmappedType(ingest.classic.field_overrides);
};

/**
 * Returns field names from classic stream field_overrides that have a description but no type.
 * Classic streams do not support description-only overrides - a type must be specified.
 */
export const getTypelessDescriptionFieldsFromClassicIngest = (
  ingest: ClassicIngestUpsertRequest
): string[] => {
  return getTypelessDescriptionFields(ingest.classic.field_overrides);
};
