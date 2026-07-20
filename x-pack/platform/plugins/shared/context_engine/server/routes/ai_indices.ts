/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, KibanaResponseFactory, RequestHandler } from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import { CONTEXT_ENGINE_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import {
  MAX_AI_INDEX_AUTOMATION_LENGTH,
  MAX_AI_INDEX_AUTOMATIONS,
  MAX_AI_INDEX_DESCRIPTION_LENGTH,
  MAX_AI_INDEX_DEST_VALUE_LENGTH,
  MAX_AI_INDEX_ID_LENGTH,
  MAX_AI_INDEX_NAME_LENGTH,
  MAX_AI_INDEX_SOURCE_VALUE_LENGTH,
  MAX_AI_INDEX_SOURCES,
  MAX_AI_INDICES,
  aiIndexByIdPath,
  aiIndexPath,
} from '../../common/constants';
import type {
  DeleteAiIndexResponse,
  GetAiIndexResponse,
  ListAiIndexResponse,
  PutAiIndexResponse,
} from '../../common/http_api/ai_indices';
import { apiPrivileges } from '../../common/features';
import {
  InvalidAiIndexDestError,
  AiIndexConflictError,
  AiIndexNotFoundError,
} from '../ai_indices/errors';
import type { AiIndexService } from '../ai_indices/service';

const API_VERSION = '2023-10-31';

const READ_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.readContextEngine] },
};

const WRITE_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.writeContextEngine] },
};

const aiIndexIdParamsSchema = schema.object({
  aiIndexId: schema.string({
    minLength: 1,
    maxLength: MAX_AI_INDEX_ID_LENGTH,
    meta: { description: 'The unique identifier of the AI index.' },
  }),
});

const putAiIndexBodySchema = schema.object({
  name: schema.string({
    minLength: 1,
    maxLength: MAX_AI_INDEX_NAME_LENGTH,
    meta: {
      description:
        'Display name for the AI index. Separate from the id so it can be renamed if necessary.',
    },
  }),
  description: schema.maybe(
    schema.string({
      maxLength: MAX_AI_INDEX_DESCRIPTION_LENGTH,
      meta: { description: 'Human-readable description of the AI index.' },
    })
  ),
  dest: schema.object({
    type: schema.oneOf([schema.literal('data_stream'), schema.literal('index')], {
      meta: {
        description:
          'The type of the backing store. `data_stream` for a data stream, or `index` for an index or index pattern.',
      },
    }),
    value: schema.string({
      minLength: 1,
      maxLength: MAX_AI_INDEX_DEST_VALUE_LENGTH,
      meta: {
        description:
          'The data stream or index (e.g. `.ai-index-ds-foo`, `.ai-index-idx-foo*`) the AI index is attached to. Must already exist and match `type`, and start with `.ai-index-ds-` (for `data_stream`) or `.ai-index-idx-` (for `index`); system indices are not allowed.',
      },
    }),
  }),
  automations: schema.arrayOf(
    schema.object({
      type: schema.literal('workflow'),
      value: schema.string({ minLength: 0, maxLength: MAX_AI_INDEX_AUTOMATION_LENGTH }),
    }),
    {
      maxSize: MAX_AI_INDEX_AUTOMATIONS,
      meta: { description: 'Automations associated with the AI index.' },
    }
  ),
  sources: schema.arrayOf(
    schema.object({
      type: schema.literal('esql'),
      value: schema.string({
        minLength: 0,
        maxLength: MAX_AI_INDEX_SOURCE_VALUE_LENGTH,
        meta: { description: 'The source value; an ES|QL query when `type` is `esql`.' },
      }),
    }),
    {
      maxSize: MAX_AI_INDEX_SOURCES,
      meta: { description: 'Additional sources that provide context for the AI index.' },
    }
  ),
});

const withContextEngineFeatureFlag =
  <P, Q, B>(handler: RequestHandler<P, Q, B>): RequestHandler<P, Q, B> =>
  async (ctx, request, response) => {
    const { uiSettings } = await ctx.core;
    // Registered by the agent_builder_sml plugin (server/ui_settings.ts).
    const isEnabled = await uiSettings.client.get<boolean>(CONTEXT_ENGINE_ENABLED_SETTING_ID);
    if (!isEnabled) {
      return response.notFound();
    }
    return handler(ctx, request, response);
  };

const handleAiIndexError = (error: unknown, response: KibanaResponseFactory) => {
  if (error instanceof InvalidAiIndexDestError) {
    return response.badRequest({ body: { message: error.message } });
  }
  if (error instanceof AiIndexNotFoundError) {
    return response.notFound({ body: { message: error.message } });
  }
  if (error instanceof AiIndexConflictError) {
    return response.conflict({ body: { message: error.message } });
  }
  throw error;
};

export const registerAiIndexRoutes = ({
  router,
  getAiIndexService,
}: {
  router: IRouter;
  getAiIndexService: () => AiIndexService;
}) => {
  // Create or update an AI index
  router.versioned
    .put({
      path: aiIndexByIdPath,
      security: WRITE_SECURITY,
      access: 'public',
      summary: 'Create or update an AI index',
      description:
        'Creates or updates an AI index record attached to an existing data stream or index pattern.',
      options: {
        tags: ['oas-tag:context engine'],
        availability: { stability: 'experimental' },
      },
    })
    .addVersion(
      {
        version: API_VERSION,
        validate: {
          request: {
            params: aiIndexIdParamsSchema,
            body: putAiIndexBodySchema,
          },
        },
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        try {
          const status = await getAiIndexService().put(request.params.aiIndexId, request.body);
          const body: PutAiIndexResponse = { status };
          return status === 'created' ? response.created({ body }) : response.ok({ body });
        } catch (error) {
          return handleAiIndexError(error, response);
        }
      })
    );

  // Get an AI index by id
  router.versioned
    .get({
      path: aiIndexByIdPath,
      security: READ_SECURITY,
      access: 'public',
      summary: 'Get an AI index',
      description: 'Fetches an AI index by id.',
      options: {
        tags: ['oas-tag:context engine'],
        availability: { stability: 'experimental' },
      },
    })
    .addVersion(
      {
        version: API_VERSION,
        validate: {
          request: {
            params: aiIndexIdParamsSchema,
          },
        },
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        try {
          const body: GetAiIndexResponse = await getAiIndexService().get(request.params.aiIndexId);
          return response.ok({ body });
        } catch (error) {
          return handleAiIndexError(error, response);
        }
      })
    );

  // List AI indices
  router.versioned
    .get({
      path: aiIndexPath,
      security: READ_SECURITY,
      access: 'public',
      summary: 'List AI indices',
      description: `Lists registered AI indices, up to a limit of ${MAX_AI_INDICES}.`,
      options: {
        tags: ['oas-tag:context engine'],
        availability: { stability: 'experimental' },
      },
    })
    .addVersion(
      {
        version: API_VERSION,
        validate: false,
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        const body: ListAiIndexResponse = {
          ai_indices: await getAiIndexService().list(),
        };
        return response.ok({ body });
      })
    );

  // Delete an AI index
  router.versioned
    .delete({
      path: aiIndexByIdPath,
      security: WRITE_SECURITY,
      access: 'public',
      summary: 'Delete an AI index',
      description:
        'Deletes an AI index by id. Only the AI index entry is deleted — backing indices are left untouched and must be removed with the Delete index API if desired.',
      options: {
        tags: ['oas-tag:context engine'],
        availability: { stability: 'experimental' },
      },
    })
    .addVersion(
      {
        version: API_VERSION,
        validate: {
          request: {
            params: aiIndexIdParamsSchema,
          },
        },
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        try {
          await getAiIndexService().delete(request.params.aiIndexId);
          const body: DeleteAiIndexResponse = { acknowledged: true };
          return response.ok({ body });
        } catch (error) {
          return handleAiIndexError(error, response);
        }
      })
    );
};
