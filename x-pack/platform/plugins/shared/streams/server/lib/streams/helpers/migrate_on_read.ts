/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams } from '@kbn/streams-schema';

export function migrateOnRead(definition: Record<string, unknown>): Streams.all.Definition {
  let migratedDefinition = definition;
  // Add required description
  if (typeof migratedDefinition.description !== 'string') {
    migratedDefinition = {
      ...migratedDefinition,
      description: '',
    };
  }
  // Rename unwired to classic
  if (
    typeof migratedDefinition.ingest === 'object' &&
    migratedDefinition.ingest &&
    'unwired' in migratedDefinition.ingest &&
    typeof migratedDefinition.ingest.unwired === 'object'
  ) {
    migratedDefinition = {
      ...migratedDefinition,
      ingest: {
        ...migratedDefinition.ingest,
        classic: {
          ...migratedDefinition.ingest.unwired,
        },
      },
    };
    delete (migratedDefinition.ingest as { unwired?: {} }).unwired;
  }
  return migratedDefinition as unknown as Streams.all.Definition;
}
