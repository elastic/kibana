/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import { AGENT_CONTEXT_LAYER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { apiPrivileges } from '../../common/features';
import type { SmlListHttpResponse } from '../../common/http_api/sml';
import {
  SML_HTTP_LIST_PAGE_DEFAULT,
  SML_HTTP_LIST_PER_PAGE_DEFAULT,
  SML_HTTP_LIST_PER_PAGE_MAX,
} from '../../common/http_api/sml';
import { smlBasePath } from '../../common/constants';
import type { SmlService } from '../services/sml/types';
import type { AgentContextLayerStartDependencies, AgentContextLayerPluginStart } from '../types';
import { toSmlHttpItem } from './common';

const AGENT_CONTEXT_LAYER_READ_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.readAgentContextLayer] },
};

export const registerListRoute = ({
  router,
  coreSetup,
  logger,
  getSmlService,
}: {
  router: IRouter;
  coreSetup: CoreSetup<AgentContextLayerStartDependencies, AgentContextLayerPluginStart>;
  logger: Logger;
  getSmlService: () => SmlService;
}) => {
  router.get(
    {
      path: smlBasePath,
      validate: {
        query: schema.object({
          page: schema.number({ defaultValue: SML_HTTP_LIST_PAGE_DEFAULT, min: 1 }),
          per_page: schema.number({
            defaultValue: SML_HTTP_LIST_PER_PAGE_DEFAULT,
            min: 1,
            max: SML_HTTP_LIST_PER_PAGE_MAX,
          }),
          type: schema.maybe(schema.string({ minLength: 1 })),
          origin_id: schema.maybe(schema.string({ minLength: 1 })),
        }),
      },
      options: { access: 'internal' },
      security: AGENT_CONTEXT_LAYER_READ_SECURITY,
    },
    async (ctx, request, response) => {
      try {
        const coreContext = await ctx.core;
        const uiSettingsClient = coreContext.uiSettings.client;

        const isEnabled = await uiSettingsClient.get<boolean>(
          AGENT_CONTEXT_LAYER_EXPERIMENTAL_FEATURES_SETTING_ID
        );
        if (!isEnabled) {
          return response.notFound();
        }

        const sml = getSmlService();
        const { page, per_page: perPage, type, origin_id: originId } = request.query;
        const esClient = coreContext.elasticsearch.client;

        const [, startDeps] = await coreSetup.getStartServices();
        const spaceId = startDeps.spaces?.spacesService?.getSpaceId(request) ?? 'default';

        const { results, total } = await sml.listDocuments({
          spaceId,
          esClient,
          page,
          perPage,
          type,
          originId,
        });

        const body: SmlListHttpResponse = {
          total,
          page,
          per_page: perPage,
          items: results.map(toSmlHttpItem),
        };

        return response.ok({ body });
      } catch (error) {
        logger.error(`SML list route error: ${(error as Error).message}`);
        throw error;
      }
    }
  );
};
