/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext, TasksPlugin } from '@kbn/core/server';
import { createCloudSetup, createCloudStart } from '../cloud_contracts';
import type { CloudConfigType } from '../config';
import { decodeCloudId } from '../../common/decode_cloud_id';
import type { CloudSetup, CloudStart } from '../plugin';

export { config } from '../config';

/** The cloud contracts a task reads: the deployment and organization the process runs for. */
export type CloudTasksSetup = CloudSetup;
export type CloudTasksStart = CloudStart;

/**
 * The cloud plugin for task runtimes: the same setup and start contracts as the plugin's, built
 * from its config (`xpack.cloud.*`, which a pod reads from its config file), without the routes,
 * usage collector, analytics context and saved objects that belong to Kibana. Without that config
 * the deployment is not a cloud one (`isCloudEnabled` is false and the ids are undefined).
 */
class CloudTasksPlugin implements TasksPlugin<CloudTasksSetup, CloudTasksStart> {
  private readonly config: CloudConfigType;

  constructor(private readonly context: PluginInitializerContext) {
    this.config = context.config.get<CloudConfigType>();
  }

  setup(): CloudTasksSetup {
    const logger = this.context.logger.get();
    const decodedId = this.config.id ? decodeCloudId(this.config.id, logger) : undefined;
    return createCloudSetup({
      config: this.config,
      logger,
      decodedId,
      elasticsearchUrl: decodedId?.elasticsearchUrl,
    });
  }

  start(): CloudTasksStart {
    return createCloudStart({ config: this.config, logger: this.context.logger.get() });
  }
}

export const plugin = async (context: PluginInitializerContext) => new CloudTasksPlugin(context);
