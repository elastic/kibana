/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldDefinition } from '@kbn/streams-schema';
import type { IngestUpsertRequest } from '@kbn/streams-schema/src/models/ingest';
import { WiredIngestUpsertRequest } from '@kbn/streams-schema/src/models/ingest/wired';

const getFieldsWithUnmappedType = (fields: FieldDefinition | undefined): string[] => {
  if (!fields) {
    return [];
  }

  return Object.entries(fields)
    .filter(([, config]) => config.type === 'unmapped')
    .map(([name]) => name);
};

export const getUnmappedFieldsFromIngestUpsert = (ingest: IngestUpsertRequest): string[] => {
  if (WiredIngestUpsertRequest.is(ingest)) {
    return getFieldsWithUnmappedType(ingest.wired.fields);
  }

  return getFieldsWithUnmappedType(ingest.classic.field_overrides);
};
