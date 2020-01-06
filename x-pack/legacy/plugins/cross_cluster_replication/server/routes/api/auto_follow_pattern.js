/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Boom from 'boom';
import { callWithRequestFactory } from '../../lib/call_with_request_factory';
import { isEsErrorFactory } from '../../lib/is_es_error_factory';
import { wrapEsError, wrapUnknownError } from '../../lib/error_wrappers';
import {
  deserializeAutoFollowPattern,
  deserializeListAutoFollowPatterns,
  serializeAutoFollowPattern,
} from '../../../common/services/auto_follow_pattern_serialization';
import { licensePreRoutingFactory } from '../../lib/license_pre_routing_factory';
import { API_BASE_PATH } from '../../../common/constants';

export const registerAutoFollowPatternRoutes = server => {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  /**
   * Returns a list of all auto-follow patterns
   */
  server.route({
    path: `${API_BASE_PATH}/auto_follow_patterns`,
    method: 'GET',
    config: {
      pre: [licensePreRouting],
    },
    handler: async request => {
      const callWithRequest = callWithRequestFactory(server, request);

      try {
        const response = await callWithRequest('ccr.autoFollowPatterns');
        return {
          patterns: deserializeListAutoFollowPatterns(response.patterns),
        };
      } catch (err) {
        if (isEsError(err)) {
          throw wrapEsError(err);
        }
        throw wrapUnknownError(err);
      }
    },
  });

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
};
