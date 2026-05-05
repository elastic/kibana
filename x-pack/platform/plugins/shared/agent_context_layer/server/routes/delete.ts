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
import type { SmlDeleteHttpResponse } from '../../common/http_api/sml';
import { smlByIdPath } from '../../common/constants';
import type { SmlService } from '../services/sml/types';
import type { AgentContextLayerStartDependencies, AgentContextLayerPluginStart } from '../types';

const AGENT_CONTEXT_LAYER_WRITE_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.writeAgentContextLayer] },
};

export const registerDeleteRoute = ({
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
  router.delete(
    {
      path: smlByIdPath,
      validate: {
        params: schema.object({
          id: schema.string({ minLength: 1 }),
        }),
      },
      options: { access: 'internal' },
      security: AGENT_CONTEXT_LAYER_WRITE_SECURITY,
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
        const { id } = request.params;
        const esClient = coreContext.elasticsearch.client;

        const [, startDeps] = await coreSetup.getStartServices();
        const spaceId = startDeps.spaces?.spacesService?.getSpaceId(request) ?? 'default';

        const deleted = await sml.deleteDocument({ id, spaceId, esClient });
        if (!deleted) {
          return response.notFound({ body: { message: `SML document '${id}' not found` } });
        }

        const body: SmlDeleteHttpResponse = { id, deleted: true };
        return response.ok({ body });
      } catch (error) {
        logger.error(`SML delete route error: ${(error as Error).message}`);
        throw error;
      }
    }
  );
};
