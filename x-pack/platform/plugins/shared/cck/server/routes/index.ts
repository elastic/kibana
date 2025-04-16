import type { IRouter } from '@kbn/core/server';
import { CckConfig } from '../../common/config';
import { getMultiCCKClient, mapSettledResponses } from '../client';

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
            (data, index) => ({
              endpoint: config.servers[index].endpoint,
              status: data,
            }),
            (error, index) => ({
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
