/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { schema } from '@kbn/config-schema';
import { getSpaceIdFromPath } from '@kbn/spaces-utils';
import type { KibanaRequest, KibanaResponseFactory } from '@kbn/core-http-server';
import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import type { HttpServiceStart } from '@kbn/core-http-server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { Logger as KibanaLogger } from '@kbn/logging';
import { inject, injectable, optional } from 'inversify';
import { Logger, PluginStart } from '@kbn/core-di';
import type { RouteHandler } from '@kbn/core-di-server';
import { CoreStart, Request, Response } from '@kbn/core-di-server';

import { DEFAULT_ALERTING_V2_ROUTE_SECURITY } from './constants';
import { ESQL_RULE_SAVED_OBJECT_TYPE } from '../saved_objects';
import { createEsqlRule, createEsqlRuleDataSchema } from '../application/esql_rule/methods/create';

const INTERNAL_ESQL_RULE_API_PATH = '/internal/alerting/esql_rule';

const createRuleParamsSchema = schema.object({
  id: schema.maybe(schema.string()),
});

@injectable()
export class CreateRuleRoute implements RouteHandler {
  static method = 'post' as const;
  static path = `${INTERNAL_ESQL_RULE_API_PATH}/{id?}`;
  static security = DEFAULT_ALERTING_V2_ROUTE_SECURITY;
  static options = { access: 'internal' } as const;
  static validate = {
    request: {
      body: createEsqlRuleDataSchema,
      params: createRuleParamsSchema,
    },
  } as const;

  constructor(
    @inject(Logger) private readonly logger: KibanaLogger,
    @inject(Request) private readonly request: KibanaRequest,
    @inject(Response) private readonly response: KibanaResponseFactory,
    @inject(CoreStart('http')) private readonly http: HttpServiceStart,
    @inject(CoreStart('savedObjects')) private readonly savedObjects: SavedObjectsServiceStart,
    @inject(PluginStart('spaces')) private readonly spaces: SpacesPluginStart,
    @inject(PluginStart('taskManager')) private readonly taskManager: TaskManagerStartContract,
    @optional() @inject(PluginStart('security')) private readonly security?: SecurityPluginStart
  ) {}

  async handle() {
    try {
      const requestBasePath = this.http.basePath.get(this.request);
      const space = getSpaceIdFromPath(requestBasePath, this.http.basePath.serverBasePath);
      const spaceId = space?.spaceId || 'default';
      const namespace = this.spaces.spacesService.spaceIdToNamespace(spaceId);

      const savedObjectsClient = this.savedObjects.getScopedClient(this.request, {
        includedHiddenTypes: [ESQL_RULE_SAVED_OBJECT_TYPE],
      });

      const created = await createEsqlRule(
        {
          logger: this.logger,
          request: this.request,
          taskManager: this.taskManager,
          savedObjectsClient,
          spaceId,
          namespace,
          getUserName: async () =>
            this.security?.authc.getCurrentUser(this.request)?.username ?? null,
        },
        { data: this.request.body as any, options: { id: (this.request.params as any).id } }
      );

      return this.response.ok({ body: created });
    } catch (e) {
      const boom = Boom.isBoom(e) ? e : Boom.boomify(e);
      this.logger.debug(`create esql rule route error: ${boom.message}`);
      return this.response.customError({
        statusCode: boom.output.statusCode,
        body: boom.output.payload,
      });
    }
  }
}


