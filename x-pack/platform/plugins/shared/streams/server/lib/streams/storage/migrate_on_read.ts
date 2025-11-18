/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isObject } from 'lodash';
import { Streams } from '@kbn/streams-schema';
import type { BaseStream } from '@kbn/streams-schema/src/models/base';
import { set } from '@kbn/safer-lodash-set';
import type { Condition } from '@kbn/streamlang';
import { isNeverCondition } from '@kbn/streamlang';
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

  // Migrate routing definitions to include status field
  if (
    isObject(migratedDefinition.ingest) &&
    'wired' in migratedDefinition.ingest &&
    isObject(migratedDefinition.ingest.wired) &&
    Array.isArray((migratedDefinition.ingest as { wired?: any }).wired.routing) &&
    (migratedDefinition.ingest as { wired?: any }).wired.routing.some(
      (route: any) => !('status' in route)
    )
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

  // Add metadata to Group stream if missing
  if (isObject(migratedDefinition.group) && !('metadata' in migratedDefinition.group)) {
    migratedDefinition = {
      ...migratedDefinition,
      group: {
        ...migratedDefinition.group,
        metadata: {},
      },
    };
    hasBeenMigrated = true;
  }

  // Add tags to Group stream if missing
  if (isObject(migratedDefinition.group) && !('tags' in migratedDefinition.group)) {
    migratedDefinition = {
      ...migratedDefinition,
      group: {
        ...migratedDefinition.group,
        tags: [],
      },
    };
    hasBeenMigrated = true;
  }

  // Add failure_store to ingest streams if missing
  if (isObject(migratedDefinition.ingest) && !('failure_store' in migratedDefinition.ingest)) {
    set(migratedDefinition, 'ingest.failure_store', { inherit: {} });
    hasBeenMigrated = true;
  }

  if (hasBeenMigrated) {
    Streams.all.Definition.asserts(migratedDefinition as unknown as BaseStream.Definition);
  }

  return migratedDefinition as unknown as Streams.all.Definition;
}
