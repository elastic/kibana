/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { definePodPlugin } from '@kbn/task-manager-plugin/server/task_pod';

/**
 * The part of the Security plugin contract tasks use in a task pod: invalidating API keys as the
 * internal user (what Security does, without its license gate, which a pod does not track) and
 * resolving the current user from a request's credentials. Everything else is not available.
 */
export const podPlugins = [
  definePodPlugin({
    id: 'security',
    start: (core, _plugins, context) => {
      const logger = context.logger.get('security') as {
        debug: (message: string) => void;
        error: (message: string) => void;
      };
      return {
        authc: {
          getCurrentUser: core.security.authc.getCurrentUser,
          apiKeys: {
            invalidateAsInternalUser: async (params: { ids: string[] }) => {
              try {
                const result =
                  await core.elasticsearch.client.asInternalUser.security.invalidateApiKey({
                    ids: params.ids,
                  });
                logger.debug(`API keys by ids=[${params.ids.join(', ')}] were invalidated`);
                return result;
              } catch (error) {
                logger.error(
                  `Failed to invalidate API keys by ids=[${params.ids.join(', ')}]: ${
                    (error as Error).message
                  }`
                );
                throw error;
              }
            },
          },
        },
      };
    },
  }),
];
