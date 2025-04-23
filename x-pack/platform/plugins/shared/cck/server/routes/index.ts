import type { IRouter } from '@kbn/core/server';
import { CckConfig } from '../../common/config';
import { getMultiCCKClient } from '../client';
import { mapSettledResponses } from '../../common';

export function defineRoutes(router: IRouter, config: CckConfig) {
  router.get(
    {
      path: '/api/cck/status',
      validate: false,
      security: {
        authz: {
          enabled: false,
          reason:
            'This API delegates security to the currently logged in user and their Elasticsearch permissions.',
        },
      },
    },
    async (context, request, response) => {
      const client = getMultiCCKClient(config.servers);
      const responses = await client.request('GET', '/api/status');
      return response.ok({
        body: {
          servers: mapSettledResponses(
            responses,
            (data, server, index) => ({
              name: server,
              endpoint: config.servers[index].endpoint,
              status: data,
            }),
            (error, server, index) => ({
              name: server,
              endpoint: config.servers[index].endpoint,
              status: {
                error: true,
                message: error.message,
              },
            })
          ),
        },
      });
    }
  );
}
