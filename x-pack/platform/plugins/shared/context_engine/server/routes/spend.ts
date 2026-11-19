/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, KibanaResponseFactory, Logger } from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { AiIndexSpendResponse, SpaceSpendResponse } from '../../common/spend';
import {
  AI_INDEX_INTERNAL_API_VERSION,
  AI_INDEX_SPEND_PATH,
  SPACE_SPEND_PATH,
} from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import { AiIndexNotFoundError } from '../ai_indices/errors';
import type { SpendServiceApi } from '../spend';
import { formatErrorMessage } from '../utils/format_es_error';
import { resolveSpaceId } from '../utils/resolve_space_id';
import { aiIndexIdParamsSchema } from './schemas/ai_indices_schema';
import { withContextEngineFeatureFlag } from './with_feature_flag';

const READ_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.readContextEngine] },
};

const handleSpendError = (error: unknown, response: KibanaResponseFactory, logger: Logger) => {
  if (error instanceof AiIndexNotFoundError) {
    return response.notFound({ body: { message: error.message } });
  }
  logger.error(error instanceof Error ? error.stack ?? error.message : String(error));
  return response.customError({ statusCode: 500, body: { message: formatErrorMessage(error) } });
};

export const registerSpendRoutes = ({
  router,
  logger,
  getSpendService,
  getSpaces,
}: {
  router: IRouter;
  logger: Logger;
  getSpendService: () => SpendServiceApi;
  getSpaces: () => Promise<SpacesPluginStart | undefined>;
}) => {
  router.versioned
    .get({
      path: SPACE_SPEND_PATH,
      security: READ_SECURITY,
      access: 'internal',
      summary: 'Get Context Engine AI spend for the space',
      description:
        'Returns month-to-date AI spend of automation runs, for the space and each AI index.',
    })
    .addVersion(
      { version: AI_INDEX_INTERNAL_API_VERSION, validate: false },
      withContextEngineFeatureFlag(async (_ctx, request, response) => {
        const spaceId = resolveSpaceId(await getSpaces(), request);
        try {
          const body: SpaceSpendResponse = await getSpendService().getSpaceSpend(spaceId);
          return response.ok({ body });
        } catch (error) {
          return handleSpendError(error, response, logger);
        }
      })
    );

  router.versioned
    .get({
      path: AI_INDEX_SPEND_PATH,
      security: READ_SECURITY,
      access: 'internal',
      summary: 'Get the AI spend of an AI Index',
      description:
        'Returns the month-to-date AI spend of an AI Index next to the totals of its space.',
    })
    .addVersion(
      {
        version: AI_INDEX_INTERNAL_API_VERSION,
        validate: { request: { params: aiIndexIdParamsSchema } },
      },
      withContextEngineFeatureFlag(async (_ctx, request, response) => {
        const spaceId = resolveSpaceId(await getSpaces(), request);
        try {
          const body: AiIndexSpendResponse = await getSpendService().getAiIndexSpend(
            spaceId,
            request.params.aiIndexId
          );
          return response.ok({ body });
        } catch (error) {
          return handleSpendError(error, response, logger);
        }
      })
    );
};
