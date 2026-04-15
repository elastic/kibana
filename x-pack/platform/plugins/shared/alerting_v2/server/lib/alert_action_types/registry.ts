/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isDeepStrictEqual } from 'util';
import type { MappingProperty, MappingsDefinition } from '@kbn/es-mappings';
import type { RouteDefinition } from '@kbn/core-di-server';
import { injectable, multiInject } from 'inversify';
import type { AlertActionDefinition } from '@kbn/alerting-v2-alert-actions';
import { createAlertActionRouteForType } from '../../routes/alert_actions/create_alert_action_route_for_type';
import { AlertActionTypeDefinitionToken } from './tokens';

const BASE_ALERT_ACTION_MAPPINGS: Record<string, MappingProperty> = {
  '@timestamp': { type: 'date' },
  last_series_event_timestamp: { type: 'date' },
  actor: { type: 'keyword' },
  action_type: { type: 'keyword' },
  group_hash: { type: 'keyword' },
  episode_status: { type: 'keyword' },
  rule_id: { type: 'keyword' },
  notification_group_id: { type: 'keyword' },
  source: { type: 'keyword' },
  space_id: { type: 'keyword' },
};

@injectable()
export class AlertActionTypeRegistry {
  constructor(
    @multiInject(AlertActionTypeDefinitionToken)
    private readonly definitions: readonly AlertActionDefinition[]
  ) {
    this.validateDefinitions();
  }

  getRouteDefinitions(): RouteDefinition[] {
    return this.definitions.map((def) =>
      createAlertActionRouteForType({
        actionType: def.id,
        pathSuffix: def.pathSuffix,
        bodySchema: def.routeBodySchema,
      })
    );
  }

  getComposedMappings(): MappingsDefinition {
    const actionSpecificMappings = this.definitions.reduce<Record<string, MappingProperty>>(
      (acc, def) => Object.assign(acc, def.esMappings),
      {}
    );

    return {
      dynamic: false,
      properties: {
        ...BASE_ALERT_ACTION_MAPPINGS,
        ...actionSpecificMappings,
      },
    };
  }

  private validateDefinitions(): void {
    const seenIds = new Set<string>();
    const seenMappings = new Map<string, { mapping: MappingProperty; owner: string }>();

    for (const def of this.definitions) {
      if (seenIds.has(def.id)) {
        throw new Error(`Duplicate alert action type id: '${def.id}'.`);
      }
      seenIds.add(def.id);

      for (const [field, mapping] of Object.entries(def.esMappings)) {
        if (field in BASE_ALERT_ACTION_MAPPINGS) {
          throw new Error(
            `Action '${def.id}' defines ES mapping for '${field}' which is a reserved base field.`
          );
        }

        const existing = seenMappings.get(field);

        if (existing && !isDeepStrictEqual(existing.mapping, mapping)) {
          throw new Error(
            `Action '${def.id}' defines ES mapping for '${field}' as ${JSON.stringify(mapping)}, ` +
              `but action '${existing.owner}' already defines it as ${JSON.stringify(
                existing.mapping
              )}.`
          );
        }

        if (!existing) {
          seenMappings.set(field, { mapping, owner: def.id });
        }
      }
    }
  }
}
