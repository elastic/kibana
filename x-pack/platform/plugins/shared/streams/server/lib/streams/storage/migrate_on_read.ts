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
import {
  ALWAYS_CONDITION,
  ensureConditionType,
  ensureStreamlangDSLHasTypedConditions,
  isNeverCondition,
} from '@kbn/streamlang';
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

    let routingMigrated = false;

    const migratedRouting = routings.map((route) => {
      if (!('where' in route) || !route.where) {
        return route;
      }

      const typedWhere = ensureConditionType(route.where as Condition);
      const whereChanged = typedWhere !== route.where;

      // If route doesn't have status field, add it based on the condition
      if (!('status' in route)) {
        const isDisabledCondition = isNeverCondition(typedWhere);

        routingMigrated = routingMigrated || whereChanged || isDisabledCondition;

        return {
          ...route,
          where: isDisabledCondition ? ALWAYS_CONDITION : typedWhere,
          status: isDisabledCondition ? 'disabled' : 'enabled',
        };
      }

      routingMigrated = routingMigrated || whereChanged;
      return whereChanged
        ? {
            ...route,
            where: typedWhere,
          }
        : route;
    });

    if (routingMigrated) {
      set(migratedDefinition, 'ingest.wired.routing', migratedRouting);
      hasBeenMigrated = true;
    }
  }

  // add settings
  if (isObject(migratedDefinition.ingest) && !('settings' in migratedDefinition.ingest)) {
    set(migratedDefinition, 'ingest.settings', {});
    hasBeenMigrated = true;
  }

  // Ensure DSL processing steps emit typed conditions
  if (
    isObject(migratedDefinition.ingest) &&
    isObject((migratedDefinition.ingest as { processing?: unknown }).processing)
  ) {
    const typedProcessing = ensureStreamlangDSLHasTypedConditions(
      (migratedDefinition.ingest as { processing?: any }).processing
    );
    if ((migratedDefinition.ingest as { processing?: any }).processing !== typedProcessing) {
      set(migratedDefinition, 'ingest.processing', typedProcessing);
      hasBeenMigrated = true;
    }
  }

  // Ensure query filters have typed conditions
  if (Array.isArray(migratedDefinition.queries)) {
    let queriesMigrated = false;
    const typedQueries = migratedDefinition.queries.map((query: any) => {
      if (query.feature?.filter) {
        const typedFilter = ensureConditionType(query.feature.filter as Condition);
        if (typedFilter !== query.feature.filter) {
          queriesMigrated = true;
          return {
            ...query,
            feature: {
              ...query.feature,
              filter: typedFilter,
            },
          };
        }
      }

      return query;
    });

    if (queriesMigrated) {
      set(migratedDefinition, 'queries', typedQueries);
      hasBeenMigrated = true;
    }
  }

  // Add ingest.type discriminator if missing
  if (isObject(migratedDefinition.ingest) && !('type' in migratedDefinition.ingest)) {
    if ('wired' in migratedDefinition.ingest) {
      set(migratedDefinition, 'ingest.type', 'wired');
      hasBeenMigrated = true;
    } else if ('classic' in migratedDefinition.ingest) {
      set(migratedDefinition, 'ingest.type', 'classic');
      hasBeenMigrated = true;
    }
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

  if (hasBeenMigrated) {
    Streams.all.Definition.asserts(migratedDefinition as unknown as BaseStream.Definition);
  }

  return migratedDefinition as unknown as Streams.all.Definition;
}
