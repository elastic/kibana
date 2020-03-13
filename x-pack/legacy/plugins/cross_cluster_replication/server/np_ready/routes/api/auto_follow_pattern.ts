/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kibanaResponseFactory } from '../../../../../../../../src/core/server';
// @ts-ignore
import { callWithRequestFactory } from '../../lib/call_with_request_factory';
import { isEsError } from '../../lib/is_es_error';
// @ts-ignore
import { wrapEsError } from '../../lib/error_wrappers';
import {
  deserializeAutoFollowPattern,
  deserializeListAutoFollowPatterns,
  serializeAutoFollowPattern,
  // @ts-ignore
} from '../../../../common/services/auto_follow_pattern_serialization';

import { licensePreRoutingFactory } from '../../lib/license_pre_routing_factory';
import { API_BASE_PATH } from '../../../../common/constants';

import { RouteDependencies } from '../types';

const mapErrorToKibanaHttpResponse = (err: any) => {
  if (isEsError(err)) {
    const { statusCode, message } = wrapEsError(err);
    return response.customError({
      statusCode,
      body: message,
    });
  }
  return response.internalError(err);
};

export const registerAutoFollowPatternRoutes = ({ router, __LEGACY }: RouteDependencies) => {
  const licensePreRouting = licensePreRoutingFactory(__LEGACY.server);

  /**
   * Returns a list of all auto-follow patterns
   */
  router.get(
    {
      path: `${API_BASE_PATH}/auto_follow_patterns`,
      validate: false,
    },
    async (ctx, request, response) => {
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
    }
  );

  /**
   * Create an auto-follow pattern
   */
  server.route({
    path: `${API_BASE_PATH}/auto_follow_patterns`,
    method: 'POST',
    config: {
      pre: [licensePreRouting],
    },
    handler: async request => {
      const callWithRequest = callWithRequestFactory(server, request);
      const { id, ...rest } = request.payload;
      const body = serializeAutoFollowPattern(rest);

      /**
       * First let's make sur that an auto-follow pattern with
       * the same id does not exist.
       */
      try {
        await callWithRequest('ccr.autoFollowPattern', { id });
        // If we get here it means that an auto-follow pattern with the same id exists
        const error = Boom.conflict(`An auto-follow pattern with the name "${id}" already exists.`);
        throw error;
      } catch (err) {
        if (err.statusCode !== 404) {
          if (isEsError(err)) {
            throw wrapEsError(err);
          }
          throw wrapUnknownError(err);
        }
      }

      try {
        return await callWithRequest('ccr.saveAutoFollowPattern', { id, body });
      } catch (err) {
        if (isEsError(err)) {
          throw wrapEsError(err);
        }
        throw wrapUnknownError(err);
      }
    },
  });

  /**
   * Update an auto-follow pattern
   */
  server.route({
    path: `${API_BASE_PATH}/auto_follow_patterns/{id}`,
    method: 'PUT',
    config: {
      pre: [licensePreRouting],
    },
    handler: async request => {
      const callWithRequest = callWithRequestFactory(server, request);
      const { id } = request.params;
      const body = serializeAutoFollowPattern(request.payload);

      try {
        return await callWithRequest('ccr.saveAutoFollowPattern', { id, body });
      } catch (err) {
        if (isEsError(err)) {
          throw wrapEsError(err);
        }
        throw wrapUnknownError(err);
      }
    },
  });

  /**
   * Returns a single auto-follow pattern
   */
  server.route({
    path: `${API_BASE_PATH}/auto_follow_patterns/{id}`,
    method: 'GET',
    config: {
      pre: [licensePreRouting],
    },
    handler: async request => {
      const callWithRequest = callWithRequestFactory(server, request);
      const { id } = request.params;

      try {
        const response = await callWithRequest('ccr.autoFollowPattern', { id });
        const autoFollowPattern = response.patterns[0];

        return deserializeAutoFollowPattern(autoFollowPattern);
      } catch (err) {
        if (isEsError(err)) {
          throw wrapEsError(err);
        }
        throw wrapUnknownError(err);
      }
    },
  });

  /**
   * Delete an auto-follow pattern
   */
  server.route({
    path: `${API_BASE_PATH}/auto_follow_patterns/{id}`,
    method: 'DELETE',
    config: {
      pre: [licensePreRouting],
    },
    handler: async request => {
      const callWithRequest = callWithRequestFactory(server, request);
      const { id } = request.params;
      const ids = id.split(',');

      const itemsDeleted = [];
      const errors = [];

      await Promise.all(
        ids.map(_id =>
          callWithRequest('ccr.deleteAutoFollowPattern', { id: _id })
            .then(() => itemsDeleted.push(_id))
            .catch(err => {
              if (isEsError(err)) {
                errors.push({ id: _id, error: wrapEsError(err) });
              } else {
                errors.push({ id: _id, error: wrapUnknownError(err) });
              }
            })
        )
      );

      return {
        itemsDeleted,
        errors,
      };
    },
  });

  /**
   * Pause auto-follow pattern(s)
   */
  server.route({
    path: `${API_BASE_PATH}/auto_follow_patterns/{id}/pause`,
    method: 'POST',
    config: {
      pre: [licensePreRouting],
    },
    handler: async request => {
      const callWithRequest = callWithRequestFactory(server, request);
      const { id } = request.params;
      const ids = id.split(',');

      const itemsPaused = [];
      const errors = [];

      await Promise.all(
        ids.map(_id =>
          callWithRequest('ccr.pauseAutoFollowPattern', { id: _id })
            .then(() => itemsPaused.push(_id))
            .catch(err => {
              if (isEsError(err)) {
                errors.push({ id: _id, error: wrapEsError(err) });
              } else {
                errors.push({ id: _id, error: wrapUnknownError(err) });
              }
            })
        )
      );

      return {
        itemsPaused,
        errors,
      };
    },
  });

  /**
   * Resume auto-follow pattern(s)
   */
  server.route({
    path: `${API_BASE_PATH}/auto_follow_patterns/{id}/resume`,
    method: 'POST',
    config: {
      pre: [licensePreRouting],
    },
    handler: async request => {
      const callWithRequest = callWithRequestFactory(server, request);
      const { id } = request.params;
      const ids = id.split(',');

      const itemsResumed = [];
      const errors = [];

      await Promise.all(
        ids.map(_id =>
          callWithRequest('ccr.resumeAutoFollowPattern', { id: _id })
            .then(() => itemsResumed.push(_id))
            .catch(err => {
              if (isEsError(err)) {
                errors.push({ id: _id, error: wrapEsError(err) });
              } else {
                errors.push({ id: _id, error: wrapUnknownError(err) });
              }
            })
        )
      );

      return {
        itemsResumed,
        errors,
      };
    },
  });
};
