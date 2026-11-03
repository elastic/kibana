/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreTasksSetup, PluginInitializerContext, TasksPlugin } from '@kbn/core/server';
import { Actions } from '@kbn/security-authorization-core';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import type { SpacesTasksStart } from '@kbn/spaces-plugin/server/tasks';

import { APPLICATION_PREFIX } from '../../common/constants';
import { checkPrivilegesFactory } from '../authorization/check_privileges';
import { checkPrivilegesDynamicallyWithRequestFactory } from '../authorization/check_privileges_dynamically';

/**
 * The part of the Security contract tasks use: invalidating API keys as the internal user (what
 * Security does, without its license gate), resolving the current user from a request's credentials,
 * and checking a request's privileges. Everything else is not available to tasks.
 */
export type SecurityTasksAuthz = Pick<
  SecurityPluginStart['authz'],
  'actions' | 'mode' | 'checkPrivilegesWithRequest' | 'checkPrivilegesDynamicallyWithRequest'
>;

export interface SecurityTasksStart {
  /**
   * Checks privileges the way Security does: an Elasticsearch \`has_privileges\` call made with the
   * request's own credentials, so a task authorizes as the user whose key it runs with.
   */
  authz: SecurityTasksAuthz;
  authc: {
    getCurrentUser: Parameters<TasksPlugin['start']>[0]['security']['authc']['getCurrentUser'];
    apiKeys: {
      invalidateAsInternalUser: (params: { ids: string[] }) => Promise<unknown>;
    };
  };
}

class SecurityTasksPlugin
  implements TasksPlugin<void, SecurityTasksStart, {}, { spaces?: SpacesTasksStart }>
{
  private applicationName?: string;

  constructor(private readonly context: PluginInitializerContext) {}

  setup(core: CoreTasksSetup) {
    // Privileges are registered per Kibana index, like the plugin names them.
    this.applicationName = `${APPLICATION_PREFIX}${core.savedObjects.getDefaultIndex()}`;
  }

  start(
    core: Parameters<TasksPlugin['start']>[0],
    plugins: { spaces?: SpacesTasksStart } = {}
  ): SecurityTasksStart {
    const logger = this.context.logger.get('security');
    const actions = new Actions();
    const { checkPrivilegesWithRequest } = checkPrivilegesFactory(
      actions,
      async () => core.elasticsearch.client,
      this.applicationName ?? `${APPLICATION_PREFIX}.kibana`
    );
    return {
      authz: {
        actions,
        // A runtime with security always checks roles for a request.
        mode: { useRbacForRequest: () => true },
        checkPrivilegesWithRequest,
        checkPrivilegesDynamicallyWithRequest: checkPrivilegesDynamicallyWithRequestFactory(
          checkPrivilegesWithRequest,
          () => plugins.spaces?.spacesService as never
        ),
      },
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
