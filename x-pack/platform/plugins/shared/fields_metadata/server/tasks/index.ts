/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreStart,
  CoreTasksSetup,
  CoreTasksStart,
  PluginInitializerContext,
  TasksPlugin,
} from '@kbn/core/server';
import { fieldsMetadataBridge } from './bridge';
import { FieldsMetadataService } from '../services/fields_metadata/fields_metadata_service';
import type {
  FieldsMetadataServiceSetup,
  FieldsMetadataServiceStart,
} from '../services/fields_metadata/types';

export type FieldsMetadataTasksSetup = FieldsMetadataServiceSetup;
export type FieldsMetadataTasksStart = FieldsMetadataServiceStart;

/**
 * The fields metadata service for task runtimes. In Kibana it is the plugin's own (the bridge).
 * In a task pod it serves the ECS, OTel, metadata and streams fields; the integration fields
 * come from Fleet, which a pod does not have: the Fleet capabilities resolve as not readable, so
 * the client skips that source, as it does for a user without Fleet privileges.
 */
class FieldsMetadataTasksPlugin
  implements TasksPlugin<FieldsMetadataTasksSetup, FieldsMetadataTasksStart>
{
  private readonly service: FieldsMetadataService;

  constructor(context: PluginInitializerContext) {
    this.service = new FieldsMetadataService(context.logger.get());
  }

  setup(_core: CoreTasksSetup): FieldsMetadataTasksSetup {
    return fieldsMetadataBridge.getSetup() ?? this.service.setup();
  }

  start(core: CoreTasksStart): FieldsMetadataTasksStart {
    const real = fieldsMetadataBridge.getStart();
    if (real) return real;

    const noFleet = { read: false };
    return this.service.start({
      elasticsearch: core.elasticsearch,
      capabilities: {
        resolveCapabilities: async () => ({ fleet: noFleet, fleetv2: noFleet }),
      },
    } as unknown as CoreStart);
  }
}

export const plugin = async (context: PluginInitializerContext) =>
  new FieldsMetadataTasksPlugin(context);
