/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { AGENT_CONTEXT_LAYER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { apiPrivileges } from '../../common/features';
import { smlCrawlerPath } from '../../common/constants';
import {
  SML_CRAWLER_GRANT_SAVED_OBJECT_TYPE,
  buildSmlCrawlerGrantId,
  type SmlCrawlerGrantSavedObjectAttributes,
} from '../saved_objects/sml_crawler_grant';
import type { SmlService } from '../services/sml/types';
import type { AgentContextLayerStartDependencies, AgentContextLayerPluginStart } from '../types';

const smlCrawlerBodySchema = schema.oneOf([
  schema.object({
    action: schema.literal('grant'),
    attachment_type: schema.string({ minLength: 1 }),
    username: schema.string({ minLength: 1 }),
  }),
  schema.object({
    action: schema.literal('revoke'),
    attachment_type: schema.string({ minLength: 1 }),
    username: schema.string({ minLength: 1 }),
  }),
  schema.object({
    action: schema.literal('run'),
    attachment_type: schema.string({ minLength: 1 }),
  }),
]);

const SML_CRAWLER_ROUTE_SECURITY: RouteSecurity = {
  authz: {
    requiredPrivileges: [
      { anyRequired: [apiPrivileges.readAgentContextLayer, apiPrivileges.manageSmlCrawler] },
    ],
  },
};

export const registerCrawlerRoute = ({
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
  router.post(
    {
      path: smlCrawlerPath,
      validate: {
        body: smlCrawlerBodySchema,
      },
      options: { access: 'internal' },
      security: SML_CRAWLER_ROUTE_SECURITY,
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

        const [coreStart, startDeps] = await coreSetup.getStartServices();
        const internalSo = coreStart.savedObjects.createInternalRepository();
        const sml = getSmlService();

        const authz = request.authzResult;
        const canManage = authz?.[apiPrivileges.manageSmlCrawler] === true;
        const canRead = authz?.[apiPrivileges.readAgentContextLayer] === true;

        const body = request.body;

        if (body.action === 'grant' || body.action === 'revoke') {
          if (!canManage) {
            return response.forbidden({
              body: { message: 'Insufficient privileges to manage crawler grants.' },
            });
          }

          const username = body.username.trim();
          const attachmentType = body.attachment_type.trim();
          const grantId = buildSmlCrawlerGrantId(username, attachmentType);

          if (!sml.getTypeDefinition(attachmentType)) {
            return response.badRequest({
              body: { message: `Unknown SML attachment type '${attachmentType}'.` },
            });
          }

          if (body.action === 'grant') {
            await internalSo.create<SmlCrawlerGrantSavedObjectAttributes>(
              SML_CRAWLER_GRANT_SAVED_OBJECT_TYPE,
              { username, attachment_type: attachmentType },
              { id: grantId, overwrite: true }
            );
            return response.ok({
              body: { acknowledged: true, action: 'grant' as const, grantId },
            });
          }

          try {
            await internalSo.delete(SML_CRAWLER_GRANT_SAVED_OBJECT_TYPE, grantId);
          } catch (error) {
            if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
              return response.notFound({ body: { message: 'Grant not found.' } });
            }
            throw error;
          }
          return response.ok({ body: { acknowledged: true, action: 'revoke' as const } });
        }

        if (!canRead) {
          return response.forbidden({
            body: { message: 'Insufficient privileges to run SML crawler.' },
          });
        }

        const security = startDeps.security;
        const currentUsername =
          security?.authc.getCurrentUser(request)?.username?.trim() ?? 'elastic';
        const attachmentType = body.attachment_type.trim();
        const grantId = buildSmlCrawlerGrantId(currentUsername, attachmentType);

        let grantExists = false;
        try {
          await internalSo.get(SML_CRAWLER_GRANT_SAVED_OBJECT_TYPE, grantId);
          grantExists = true;
        } catch (error) {
          if (!SavedObjectsErrorHelpers.isNotFoundError(error)) {
            throw error;
          }
        }

        if (!grantExists) {
          return response.forbidden({
            body: {
              message: `No crawler grant for user '${currentUsername}' and type '${attachmentType}'.`,
            },
          });
        }

        const definition = sml.getTypeDefinition(attachmentType);
        if (!definition) {
          return response.badRequest({
            body: { message: `Unknown SML attachment type '${attachmentType}'.` },
          });
        }

        const scopedEs = coreContext.elasticsearch.client.asCurrentUser;
        const scopedSo = coreStart.savedObjects.getScopedClient(request);

        await sml.getCrawler().crawl({
          definition,
          esClient: coreStart.elasticsearch.client.asInternalUser,
          savedObjectsClient: internalSo,
          userScope: {
            elasticsearchClient: scopedEs,
            savedObjectsClient: scopedSo,
          },
        });

        return response.ok({ body: { acknowledged: true, action: 'run' as const } });
      } catch (error) {
        logger.error(`SML crawler route error: ${(error as Error).message}`);
        throw error;
      }
    }
  );
};
