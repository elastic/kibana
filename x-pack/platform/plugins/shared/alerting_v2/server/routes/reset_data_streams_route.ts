/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Internal endpoint that wipes and reinstalls the alerting_v2 data streams
 * (index templates + backing indices) without touching saved objects or tasks.
 *
 * Use this when the startup migration (DatastreamInitializer.maybeDestroyForMigration)
 * failed and the data streams are in a bad state, or to manually trigger the
 * episode→alert field rename on a cluster that did not pick it up automatically.
 *
 * NOT a substitute for _reset_resources: rules and action policies are preserved.
 * Call _reset_resources if you also need to clear saved objects.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { ReservedPrivilegesSet } from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import { Logger as CoreLogger } from '@kbn/core-di';
import { isResponseError } from '@kbn/es-errors';
import { inject, injectable } from 'inversify';

import { EsServiceInternalToken } from '../lib/services/es_service/tokens';
import { DatastreamInitializer } from '../lib/services/resource_service/datastream_initializer';
import { getDataStreamResourceDefinitions } from '../resources/datastreams/register';
import type { ResourceDefinition } from '../resources/datastreams/types';
import { AlertingRouteContext } from './alerting_route_context';
import { BaseAlertingRoute } from './base_alerting_route';

const RESET_DATA_STREAMS_API_PATH = '/internal/alerting/v2/_reset_data_streams';

@injectable()
export class ResetDataStreamsRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = RESET_DATA_STREAMS_API_PATH;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ReservedPrivilegesSet.superuser],
    },
  };
  static routeOptions = {
    access: 'internal',
    summary: 'Reset alerting v2 data streams (wipe and reinstall index templates)',
  } as const;

  protected static schemas = {
    response: {
      204: {
        description: 'Data streams were reset successfully.',
      },
    },
  };

  protected readonly routeName = 'reset alerting v2 data streams';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(EsServiceInternalToken) private readonly esClient: ElasticsearchClient,
    @inject(CoreLogger) private readonly coreLogger: Logger
  ) {
    super(ctx);
  }

  protected async execute() {
    const definitions = getDataStreamResourceDefinitions();

    this.ctx.logger.debug({
      message: 'Resetting alerting v2 data streams',
    });

    for (const definition of definitions) {
      await this.resetDefinition(definition);
    }

    return this.ctx.response.noContent();
  }

  /**
   * Reinstalls the current template first, then deletes the data stream and recreates it.
   * Installing the template before deleting ensures that any gap write during the wipe
   * auto-creates the stream from the correct mappings rather than the old shape.
   * The template is not deleted: that would leave a window where a gap write could
   * auto-create with no template at all.
   */
  private async resetDefinition(definition: ResourceDefinition): Promise<void> {
    const initializer = new DatastreamInitializer(this.coreLogger, this.esClient, definition);
    await initializer.installTemplate();
    await this.deleteDataStreamIfExists(definition.dataStreamName);
    await initializer.initialize();
  }

  private async deleteDataStreamIfExists(name: string): Promise<void> {
    try {
      await this.esClient.indices.deleteDataStream({ name });
    } catch (error) {
      if (isResponseError(error) && error.statusCode === 404) {
        return;
      }
      throw error;
    }
  }
}
