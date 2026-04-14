/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  ) {}

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
}
