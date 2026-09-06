/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, Logger } from '@kbn/core/server';
import { getSpaceIdFromPath } from '@kbn/core-spaces-common';
import { parseViewSpec, validateView } from '@kbn/adaptive-ui';
import type { PostToSlackResponse } from '../../common/http_api';
import { adaptiveUiApiPaths, MAX_VIEW_SPEC_BYTES } from '../../common/http_api';
import { getKibanaPublicUrl, type KibanaPublicUrlHttp } from '../kibana_public_url';
import { postViewToSlack } from '../slack/post_view';
import type { AdaptiveUiRouteDependencies } from './types';

const MAX_ID_LENGTH = 256;

export const registerPostToSlackRoute = ({
  router,
  logger,
  getActions,
  http,
}: {
  router: IRouter;
  logger: Logger;
  getActions: AdaptiveUiRouteDependencies['getActions'];
  http: KibanaPublicUrlHttp;
}): void => {
  router.post(
    {
      path: adaptiveUiApiPaths.postToSlack,
      security: {
        authz: {
          enabled: false,
          reason:
            'Posting runs through the actions client, which enforces the caller privileges for executing the connector.',
        },
      },
      validate: {
        body: schema.object({
          connectorId: schema.string({ minLength: 1, maxLength: MAX_ID_LENGTH }),
          channel: schema.string({ minLength: 1, maxLength: MAX_ID_LENGTH }),
          spec: schema.recordOf(schema.string(), schema.any()),
          threadTs: schema.maybe(schema.string({ maxLength: MAX_ID_LENGTH })),
        }),
      },
      options: { body: { maxBytes: MAX_VIEW_SPEC_BYTES } },
    },
    async (_context, request, response) => {
      const { connectorId, channel, spec, threadTs } = request.body;

      const parsed = parseViewSpec(spec);
      const view = parsed.spec;
      const validation = view ? validateView(view) : parsed;
      if (!view || !validation.valid) {
        return response.badRequest({
          body: { message: `Invalid ViewSpec: ${validation.errors.join('; ')}` },
        });
      }

      const actions = await getActions();
      const actionsClient = await actions.getActionsClientWithRequest(request);
      const { spaceId } = getSpaceIdFromPath(request.url.pathname, http.basePath.serverBasePath);

      try {
        const posted = await postViewToSlack({
          actionsClient,
          connectorId,
          channel,
          view,
          kibanaUrl: getKibanaPublicUrl({ http, spaceId }),
          threadTs,
          logger,
        });
        return response.ok<PostToSlackResponse>({ body: posted });
      } catch (error) {
        logger.error(`Adaptive UI Slack post failed: ${(error as Error).message}`);
        return response.customError({
          statusCode: 502,
          body: { message: (error as Error).message },
        });
      }
    }
  );
};
