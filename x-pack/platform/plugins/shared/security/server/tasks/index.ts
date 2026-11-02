/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext, TasksPlugin } from '@kbn/core/server';

/**
 * The part of the Security contract tasks use: invalidating API keys as the internal user (what
 * Security does, without its license gate) and resolving the current user from a request's
 * credentials. Everything else is not available to tasks.
 */
export interface SecurityTasksStart {
  authc: {
    getCurrentUser: Parameters<TasksPlugin['start']>[0]['security']['authc']['getCurrentUser'];
    apiKeys: {
      invalidateAsInternalUser: (params: { ids: string[] }) => Promise<unknown>;
    };
  };
}

class SecurityTasksPlugin implements TasksPlugin<void, SecurityTasksStart> {
  constructor(private readonly context: PluginInitializerContext) {}

  setup() {}

  start(core: Parameters<TasksPlugin['start']>[0]): SecurityTasksStart {
    const logger = this.context.logger.get('security');
    return {
      authc: {
        getCurrentUser: core.security.authc.getCurrentUser,
        apiKeys: {
          invalidateAsInternalUser: async (params) => {
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
  }
}

export const plugin = async (context: PluginInitializerContext) => new SecurityTasksPlugin(context);
