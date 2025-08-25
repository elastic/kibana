/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams } from '@kbn/streams-schema';
import type { BaseStream } from '@kbn/streams-schema/src/models/base';
import {
  migrateRoutingIfConditionToStreamlang,
  migrateOldProcessingArrayToStreamlang,
} from './migrate_to_streamlang_on_read';

export function migrateOnRead(definition: Record<string, unknown>): Streams.all.Definition {
  let migratedDefinition = definition;
  let hasBeenMigrated = false;
  // Add required description
  if (typeof migratedDefinition.description !== 'string') {
    migratedDefinition = {
      ...migratedDefinition,
      description: '',
    };
    hasBeenMigrated = true;
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
    hasBeenMigrated = true;
  }

  // Migrate routing "if" Condition to Streamlang
  if (
    migratedDefinition.ingest &&
    typeof migratedDefinition.ingest === 'object' &&
    'wired' in migratedDefinition.ingest &&
    (migratedDefinition.ingest as { wired?: unknown }).wired &&
    typeof (migratedDefinition.ingest as { wired?: any }).wired === 'object' &&
    Array.isArray((migratedDefinition.ingest as { wired?: any }).wired.routing) &&
    (migratedDefinition.ingest as { wired?: any }).wired.routing.some((route: any) => 'if' in route)
  ) {
    migratedDefinition = migrateRoutingIfConditionToStreamlang(migratedDefinition);
    hasBeenMigrated = true;
  }

  // Migrate old flat processing array to Streamlang DSL
  if (
    migratedDefinition.ingest &&
    typeof migratedDefinition.ingest === 'object' &&
    Array.isArray((migratedDefinition.ingest as { processing?: unknown }).processing)
  ) {
    migratedDefinition = migrateOldProcessingArrayToStreamlang(migratedDefinition);
    hasBeenMigrated = true;
  }

  if (hasBeenMigrated) {
    Streams.all.Definition.asserts(migratedDefinition as unknown as BaseStream.Definition);
  }

  return migratedDefinition as unknown as Streams.all.Definition;
}
