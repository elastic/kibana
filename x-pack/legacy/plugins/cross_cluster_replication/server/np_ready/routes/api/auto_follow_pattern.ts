/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';
// @ts-ignore
import { callWithRequestFactory } from '../../lib/call_with_request_factory';
import { isEsError } from '../../lib/is_es_error';
// @ts-ignore
import {
  deserializeAutoFollowPattern,
  deserializeListAutoFollowPatterns,
  serializeAutoFollowPattern,
  // @ts-ignore
} from '../../../../common/services/auto_follow_pattern_serialization';

import { licensePreRoutingFactory } from '../../lib/license_pre_routing_factory';
import { API_BASE_PATH } from '../../../../common/constants';

import { RouteDependencies } from '../types';
import { mapErrorToKibanaHttpResponse } from '../map_to_kibana_http_error';

export const registerAutoFollowPatternRoutes = ({ router, __LEGACY }: RouteDependencies) => {
  /**
   * Returns a list of all auto-follow patterns
   */
  router.get(
    {
      path: `${API_BASE_PATH}/auto_follow_patterns`,
      validate: false,
    },
    licensePreRoutingFactory({
      __LEGACY,
      requestHandler: async (ctx, request, response) => {
        const callWithRequest = callWithRequestFactory(__LEGACY.server, request);

        try {
          const result = await callWithRequest('ccr.autoFollowPatterns');
          return response.ok({
            body: {
              patterns: deserializeListAutoFollowPatterns(result.patterns),
            },
          });
        } catch (err) {
          return mapErrorToKibanaHttpResponse(err);
        }
      },
    })
  );

  /**
   * Create an auto-follow pattern
   */
  router.post(
    {
      path: `${API_BASE_PATH}/auto_follow_patterns`,
      validate: {
        body: schema.object(
          {
            id: schema.string(),
          },
          { unknowns: 'allow' }
        ),
      },
    },
    licensePreRoutingFactory({
      __LEGACY,
      requestHandler: async (ctx, request, response) => {
        const callWithRequest = callWithRequestFactory(__LEGACY.server, request);
        const { id, ...rest } = request.body;
        const body = serializeAutoFollowPattern(rest);

        /**
         * First let's make sur that an auto-follow pattern with
         * the same id does not exist.
         */
        try {
          await callWithRequest('ccr.autoFollowPattern', { id });
          // If we get here it means that an auto-follow pattern with the same id exists
          return response.conflict({
            body: `An auto-follow pattern with the name "${id}" already exists.`,
          });
        } catch (err) {
          if (err.statusCode !== 404) {
            return mapErrorToKibanaHttpResponse(err);
          }
        }

        try {
          return response.ok({
            body: await callWithRequest('ccr.saveAutoFollowPattern', { id, body }),
          });
        } catch (err) {
          return mapErrorToKibanaHttpResponse(err);
        }
      },
    })
  );

  /**
   * Update an auto-follow pattern
   */
  router.put(
    {
      path: `${API_BASE_PATH}/auto_follow_patterns/{id}`,
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: schema.object({}, { unknowns: 'allow' }),
      },
    },
    licensePreRoutingFactory({
      __LEGACY,
      requestHandler: async (ctx, request, response) => {
        const callWithRequest = callWithRequestFactory(__LEGACY.server, request);
        const { id } = request.params;
        const body = serializeAutoFollowPattern(request.body);

        try {
          return response.ok({
            body: await callWithRequest('ccr.saveAutoFollowPattern', { id, body }),
          });
        } catch (err) {
          return mapErrorToKibanaHttpResponse(err);
        }
      },
    })
  );

  /**
   * Returns a single auto-follow pattern
   */
  router.get(
    {
      path: `${API_BASE_PATH}/auto_follow_patterns/{id}`,
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    licensePreRoutingFactory({
      __LEGACY,
      requestHandler: async (ctx, request, response) => {
        const callWithRequest = callWithRequestFactory(__LEGACY.server, request);
        const { id } = request.params;

        try {
          const result = await callWithRequest('ccr.autoFollowPattern', { id });
          const autoFollowPattern = result.patterns[0];

          return response.ok({
            body: deserializeAutoFollowPattern(autoFollowPattern),
          });
        } catch (err) {
          return mapErrorToKibanaHttpResponse(err);
        }
      },
    })
  );

  /**
   * Delete an auto-follow pattern
   */
  router.delete(
    {
      path: `${API_BASE_PATH}/auto_follow_patterns/{id}`,
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    licensePreRoutingFactory({
      __LEGACY,
      requestHandler: async (ctx, request, response) => {
        const callWithRequest = callWithRequestFactory(__LEGACY.server, request);
        const { id } = request.params;
        const ids = id.split(',');

        const itemsDeleted: string[] = [];
        const errors: Array<{ id: string; error: any }> = [];

        await Promise.all(
          ids.map((_id) =>
            callWithRequest('ccr.deleteAutoFollowPattern', { id: _id })
              .then(() => itemsDeleted.push(_id))
              .catch((err: Error) => {
                if (isEsError(err)) {
                  errors.push({ id: _id, error: mapErrorToKibanaHttpResponse(err) });
                } else {
                  errors.push({ id: _id, error: mapErrorToKibanaHttpResponse(err) });
                }
              })
          )
        );

        return response.ok({
          body: {
            itemsDeleted,
            errors,
          },
        });
      },
    })
  );

  /**
   * Pause auto-follow pattern(s)
   */
  router.post(
    {
      path: `${API_BASE_PATH}/auto_follow_patterns/{id}/pause`,
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    licensePreRoutingFactory({
      __LEGACY,
      requestHandler: async (ctx, request, response) => {
        const callWithRequest = callWithRequestFactory(__LEGACY.server, request);
        const { id } = request.params;
        const ids = id.split(',');

        const itemsPaused: string[] = [];
        const errors: Array<{ id: string; error: any }> = [];

        await Promise.all(
          ids.map((_id) =>
            callWithRequest('ccr.pauseAutoFollowPattern', { id: _id })
              .then(() => itemsPaused.push(_id))
              .catch((err: Error) => {
                if (isEsError(err)) {
                  errors.push({ id: _id, error: mapErrorToKibanaHttpResponse(err) });
                } else {
                  errors.push({ id: _id, error: mapErrorToKibanaHttpResponse(err) });
                }
              })
          )
        );

        return response.ok({
          body: {
            itemsPaused,
            errors,
          },
        });
      },
    })
  );

  /**
   * Resume auto-follow pattern(s)
   */
  router.post(
    {
      path: `${API_BASE_PATH}/auto_follow_patterns/{id}/resume`,
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    licensePreRoutingFactory({
      __LEGACY,
      requestHandler: async (ctx, request, response) => {
        const callWithRequest = callWithRequestFactory(__LEGACY.server, request);
        const { id } = request.params;
        const ids = id.split(',');

        const itemsResumed: string[] = [];
        const errors: Array<{ id: string; error: any }> = [];

        await Promise.all(
          ids.map((_id) =>
            callWithRequest('ccr.resumeAutoFollowPattern', { id: _id })
              .then(() => itemsResumed.push(_id))
              .catch((err: Error) => {
                if (isEsError(err)) {
                  errors.push({ id: _id, error: mapErrorToKibanaHttpResponse(err) });
                } else {
                  errors.push({ id: _id, error: mapErrorToKibanaHttpResponse(err) });
                }
              })
          )
        );

        return response.ok({
          body: {
            itemsResumed,
            errors,
          },
        });
      },
    })
  );
};
