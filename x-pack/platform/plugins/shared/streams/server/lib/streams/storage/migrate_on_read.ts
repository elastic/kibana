/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isObject } from 'lodash';
import { Streams } from '@kbn/streams-schema';
import type { BaseStream } from '@kbn/streams-schema/src/models/base';
import { isRoot } from '@kbn/streams-schema/src/shared/hierarchy';
import { set } from '@kbn/safer-lodash-set';
import type { Condition } from '@kbn/streamlang';
import { isNeverCondition } from '@kbn/streamlang';
import {
  migrateRoutingIfConditionToStreamlang,
  migrateOldProcessingArrayToStreamlang,
  migrateWhereBlocksToCondition,
} from './migrate_to_streamlang_on_read';

export function migrateOnRead(definition: Record<string, unknown>): Streams.all.Definition {
  let migratedDefinition = definition;
  let hasBeenMigrated = false;
  if ('group' in migratedDefinition) {
    return migratedDefinition as unknown as Streams.all.Definition;
  }
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
    isObject(migratedDefinition.ingest) &&
    'unwired' in migratedDefinition.ingest &&
    isObject(migratedDefinition.ingest.unwired)
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
    isObject(migratedDefinition.ingest) &&
    'wired' in migratedDefinition.ingest &&
    (migratedDefinition.ingest as { wired?: unknown }).wired &&
    typeof (migratedDefinition.ingest as { wired?: unknown }).wired === 'object' &&
    Array.isArray(
      (migratedDefinition.ingest as { wired?: { routing?: unknown[] } }).wired?.routing
    ) &&
    (
      migratedDefinition.ingest as { wired?: { routing?: Array<Record<string, unknown>> } }
    ).wired!.routing!.some((route) => 'if' in route)
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

  // Migrate routing definitions to include status field
  if (
    isObject(migratedDefinition.ingest) &&
    'wired' in migratedDefinition.ingest &&
    isObject(migratedDefinition.ingest.wired) &&
    Array.isArray(
      (migratedDefinition.ingest as { wired?: { routing?: unknown[] } }).wired?.routing
    ) &&
    (
      migratedDefinition.ingest as { wired?: { routing?: Array<Record<string, unknown>> } }
    ).wired!.routing!.some((route) => !('status' in route))
  ) {
    const routings = get(migratedDefinition, 'ingest.wired.routing', []) as Array<
      Record<string, unknown>
    >;

    const migratedRouting = routings.map((route) => {
      // If route doesn't have status field, add it based on the condition
      if (!('status' in route) && 'where' in route) {
        const isDisabledCondition = isNeverCondition(route.where as Condition);

        return {
          ...route,
          where: isDisabledCondition ? { always: {} } : route.where,
          status: isDisabledCondition ? 'disabled' : 'enabled',
        };
      }
      return route;
    });

    set(migratedDefinition, 'ingest.wired.routing', migratedRouting);
    hasBeenMigrated = true;
  }

  // add settings
  if (isObject(migratedDefinition.ingest) && !('settings' in migratedDefinition.ingest)) {
    set(migratedDefinition, 'ingest.settings', {});
    hasBeenMigrated = true;
  }

  // Add failure_store to ingest streams if missing
  if (isObject(migratedDefinition.ingest) && !('failure_store' in migratedDefinition.ingest)) {
    const streamName = migratedDefinition.name;

    if (
      'wired' in migratedDefinition.ingest &&
      typeof streamName === 'string' &&
      isRoot(streamName)
    ) {
      set(migratedDefinition, 'ingest.failure_store', {
        lifecycle: { enabled: { data_retention: '30d' } },
      });
    } else {
      set(migratedDefinition, 'ingest.failure_store', { inherit: {} });
    }
    hasBeenMigrated = true;
  }

  // Migrate where blocks to use 'condition' property instead of 'where'
  if (
    isObject(migratedDefinition.ingest) &&
    isObject((migratedDefinition.ingest as { processing?: unknown }).processing) &&
    Array.isArray(
      (migratedDefinition.ingest as { processing?: { steps?: unknown[] } }).processing?.steps
    )
  ) {
    const steps = (migratedDefinition.ingest as { processing: { steps: unknown[] } }).processing
      .steps;
    const migratedSteps = migrateWhereBlocksToCondition(steps);

    if (migratedSteps.migrated) {
      set(migratedDefinition, 'ingest.processing.steps', migratedSteps.steps);
      hasBeenMigrated = true;
    }
  }
  // Add required updated_at to all stream types
  if (typeof migratedDefinition.updated_at !== 'string') {
    migratedDefinition = {
      ...migratedDefinition,
      updated_at: new Date(0).toISOString(),
    };
    hasBeenMigrated = true;
  }

  // Add updated_at to processing for ingest streams
  if (
    isObject(migratedDefinition.ingest) &&
    'processing' in migratedDefinition.ingest &&
    isObject(migratedDefinition.ingest.processing) &&
    !('updated_at' in migratedDefinition.ingest.processing)
  ) {
    migratedDefinition = {
      ...migratedDefinition,
      ingest: {
        ...migratedDefinition.ingest,
        processing: {
          ...migratedDefinition.ingest.processing,
          updated_at: new Date(0).toISOString(),
        },
      },
    };
    hasBeenMigrated = true;
  }

  // Initialize query_streams as empty array for ingest streams (WiredStream and ClassicStream)
  // that don't have this field yet
  if (isObject(migratedDefinition.ingest) && !('query_streams' in migratedDefinition)) {
    migratedDefinition = {
      ...migratedDefinition,
      query_streams: [],
    };
    hasBeenMigrated = true;
  }

  if (hasBeenMigrated) {
    Streams.all.Definition.asserts(migratedDefinition as unknown as BaseStream.Definition);
  }

  return migratedDefinition as unknown as Streams.all.Definition;
}
