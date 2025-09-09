import type { IRouter } from '@kbn/core/server';

export function defineRoutes(router: IRouter) {
  router.get(
    {
      path: '/api/chat_data_registry/example',
      validate: false,
    },
    async (context, request, response) => {
      return response.ok({
        body: {
          time: new Date().toISOString(),
        },
      });
    }
  );
}
