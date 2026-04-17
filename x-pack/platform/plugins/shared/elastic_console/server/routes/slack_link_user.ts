/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import type { ElasticConsolePluginStart, ElasticConsoleStartDependencies } from '../types';
import {
  SLACK_USER_MAPPING_SO_TYPE,
  type SlackUserMappingAttributes,
} from '../lib/slack_user_mapping_so';

export const registerSlackLinkUserRoutes = ({
  router,
  coreSetup,
  logger,
}: {
  router: IRouter;
  coreSetup: CoreSetup<ElasticConsoleStartDependencies, ElasticConsolePluginStart>;
  logger: Logger;
}) => {
  // Link current Kibana user to a Slack user ID
  router.post(
    {
      path: '/internal/elastic_console/slack/link_user',
      security: {
        authz: {
          enabled: false,
          reason: 'Caller must be an authenticated Kibana user; checked via getCurrentUser',
        },
      },
      options: { access: 'internal' },
      validate: {
        body: schema.object({
          slack_user_id: schema.string({ minLength: 1 }),
        }),
      },
    },
    async (_ctx, request, response) => {
      try {
        const [coreStart] = await coreSetup.getStartServices();

        const authUser = coreStart.security.authc.getCurrentUser(request);
        if (!authUser) {
          return response.unauthorized();
        }

        const soClient = coreStart.savedObjects.createInternalRepository([
          SLACK_USER_MAPPING_SO_TYPE,
        ]);
        const now = new Date().toISOString();
        const { slack_user_id: slackUserId } = request.body;

        // Use the slack_user_id as the SO document ID for O(1) lookup in the handler
        await soClient.create<SlackUserMappingAttributes>(
          SLACK_USER_MAPPING_SO_TYPE,
          {
            slack_user_id: slackUserId,
            kibana_username: authUser.username,
            kibana_user_id: authUser.profile_uid,
            created_at: now,
            updated_at: now,
          },
          { id: slackUserId, overwrite: true }
        );

        return response.ok({ body: { slack_user_id: slackUserId, username: authUser.username } });
      } catch (error) {
        logger.error(`Link Slack user error: ${error.message}`);
        return response.customError({ statusCode: 500, body: { message: error.message } });
      }
    }
  );

  // Get the Slack user ID linked to the current Kibana user
  router.get(
    {
      path: '/internal/elastic_console/slack/link_user',
      security: {
        authz: {
          enabled: false,
          reason: 'Caller must be an authenticated Kibana user; checked via getCurrentUser',
        },
      },
      options: { access: 'internal' },
      validate: {},
    },
    async (_ctx, request, response) => {
      try {
        const [coreStart] = await coreSetup.getStartServices();

        const authUser = coreStart.security.authc.getCurrentUser(request);
        if (!authUser) {
          return response.unauthorized();
        }

        const soClient = coreStart.savedObjects.createInternalRepository([
          SLACK_USER_MAPPING_SO_TYPE,
        ]);

        // Search for a mapping where kibana_username matches the current user
        const results = await soClient.find<SlackUserMappingAttributes>({
          type: SLACK_USER_MAPPING_SO_TYPE,
          filter: `elastic-console-slack-user-mapping.attributes.kibana_username: "${authUser.username}"`,
          perPage: 1,
        });

        if (results.total === 0) {
          return response.ok({ body: { linked: false } });
        }

        const mapping = results.saved_objects[0];
        return response.ok({
          body: {
            linked: true,
            slack_user_id: mapping.attributes.slack_user_id,
            username: mapping.attributes.kibana_username,
          },
        });
      } catch (error) {
        logger.error(`Get Slack link error: ${error.message}`);
        return response.customError({ statusCode: 500, body: { message: error.message } });
      }
    }
  );
};
