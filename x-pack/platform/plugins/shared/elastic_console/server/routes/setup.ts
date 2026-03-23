/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { ElasticConsolePluginStart, ElasticConsoleStartDependencies } from '../types';
import { isElasticConsoleEnabled } from './is_enabled';

export const registerSetupRoute = ({
  router,
  coreSetup,
  logger,
  cloud,
}: {
  router: IRouter;
  coreSetup: CoreSetup<ElasticConsoleStartDependencies, ElasticConsolePluginStart>;
  logger: Logger;
  cloud?: CloudSetup;
}) => {
  router.post(
    {
      path: '/internal/elastic_console/setup',
      security: {
        authz: { enabled: false, reason: 'This route creates an API key scoped to the user' },
      },
      options: {
        access: 'internal',
      },
      validate: {},
    },
    async (ctx, request, response) => {
      try {
        const [coreStart] = await coreSetup.getStartServices();

        if (!(await isElasticConsoleEnabled(coreStart, request))) {
          return response.notFound();
        }

        const esClient = coreStart.elasticsearch.client.asScoped(request).asCurrentUser;

        // Create an API key with privileges for inference and connector actions
        const apiKeyResponse = await esClient.security.createApiKey({
          name: `elastic-console-${Date.now()}`,
          expiration: '30d',
        });

        const apiKeyEncoded = Buffer.from(
          `${apiKeyResponse.id}:${apiKeyResponse.api_key}`
        ).toString('base64');

        // Resolve externally-reachable URLs.
        // On Cloud (including serverless projects), cloud plugin and server.publicBaseUrl
        // are the authoritative sources. The local fallbacks only apply during development.
        const elasticsearchUrl =
          cloud?.elasticsearchUrl ||
          coreStart.elasticsearch.publicBaseUrl ||
          'http://localhost:9200';

        const { protocol, hostname, port } = coreSetup.http.getServerInfo();
        const kibanaUrl =
          coreStart.http.basePath.publicBaseUrl ||
          cloud?.kibanaUrl ||
          `${protocol}://${hostname}:${port}`;

        return response.ok({
          body: {
            elasticsearchUrl,
            kibanaUrl,
            apiKeyEncoded,
          },
        });
      } catch (error) {
        logger.error(`Setup error: ${error.message}`);
        return response.customError({
          statusCode: error.statusCode || 500,
          body: {
            message: error.message,
          },
        });
      }
    }
  );
};
