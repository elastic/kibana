/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

import {
  deserializeFollowerIndex,
  deserializeListFollowerIndices,
  serializeFollowerIndex,
  serializeAdvancedSettings,
} from '../../../common/services/follower_index_serialization';
import { API_BASE_PATH } from '../../../common/constants';
import { removeEmptyFields } from '../../../common/services/utils';
import { callWithRequestFactory } from '../../lib/call_with_request_factory';
import { isEsErrorFactory } from '../../lib/is_es_error_factory';
import { wrapEsError, wrapUnknownError } from '../../lib/error_wrappers';
import { licensePreRoutingFactory } from '../../lib/license_pre_routing_factory';

export const registerFollowerIndexRoutes = server => {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  /**
   * Returns a list of all follower indices
   */
  server.route({
    path: `${API_BASE_PATH}/follower_indices`,
    method: 'GET',
    config: {
      pre: [licensePreRouting],
    },
    handler: async request => {
      const callWithRequest = callWithRequestFactory(server, request);

      try {
        const { follower_indices: followerIndices } = await callWithRequest('ccr.info', {
          id: '_all',
        });

        const {
          follow_stats: { indices: followerIndicesStats },
        } = await callWithRequest('ccr.stats');

        const followerIndicesStatsMap = followerIndicesStats.reduce((map, stats) => {
          map[stats.index] = stats;
          return map;
        }, {});

        const collatedFollowerIndices = followerIndices.map(followerIndex => {
          return {
            ...followerIndex,
            ...followerIndicesStatsMap[followerIndex.follower_index],
          };
        });

        return {
          indices: deserializeListFollowerIndices(collatedFollowerIndices),
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
   * Returns a single follower index pattern
   */
  server.route({
    path: `${API_BASE_PATH}/follower_indices/{id}`,
    method: 'GET',
    config: {
      pre: [licensePreRouting],
    },
    handler: async request => {
      const callWithRequest = callWithRequestFactory(server, request);
      const { id } = request.params;

      try {
        const { follower_indices: followerIndices } = await callWithRequest('ccr.info', { id });

        const followerIndexInfo = followerIndices && followerIndices[0];

        if (!followerIndexInfo) {
          const error = Boom.notFound(`The follower index "${id}" does not exist.`);
          throw error;
        }

        // If this follower is paused, skip call to ES stats api since it will return 404
        if (followerIndexInfo.status === 'paused') {
          return deserializeFollowerIndex({
            ...followerIndexInfo,
          });
        } else {
          const { indices: followerIndicesStats } = await callWithRequest(
            'ccr.followerIndexStats',
            { id }
          );

          return deserializeFollowerIndex({
            ...followerIndexInfo,
            ...(followerIndicesStats ? followerIndicesStats[0] : {}),
          });
        }
      } catch (err) {
        if (isEsError(err)) {
          throw wrapEsError(err);
        }
        throw wrapUnknownError(err);
      }
    },
  });

  /**
   * Create a follower index
   */
  server.route({
    path: `${API_BASE_PATH}/follower_indices`,
    method: 'POST',
    config: {
      pre: [licensePreRouting],
    },
    handler: async request => {
      const callWithRequest = callWithRequestFactory(server, request);
      const { name, ...rest } = request.payload;
      const body = removeEmptyFields(serializeFollowerIndex(rest));

      try {
        return await callWithRequest('ccr.saveFollowerIndex', { name, body });
      } catch (err) {
        if (isEsError(err)) {
          throw wrapEsError(err);
        }
        throw wrapUnknownError(err);
      }
    },
  });

  /**
   * Edit a follower index
   */
  server.route({
    path: `${API_BASE_PATH}/follower_indices/{id}`,
    method: 'PUT',
    config: {
      pre: [licensePreRouting],
    },
    handler: async request => {
      const callWithRequest = callWithRequestFactory(server, request);
      const { id } = request.params;

      async function isFollowerIndexPaused() {
        const { follower_indices: followerIndices } = await callWithRequest('ccr.info', { id });

        const followerIndexInfo = followerIndices && followerIndices[0];

        if (!followerIndexInfo) {
          const error = Boom.notFound(`The follower index "${id}" does not exist.`);
          throw error;
        }

        return followerIndexInfo.status === 'paused';
      }

      // We need to first pause the follower and then resume it passing the advanced settings
      try {
        // Retrieve paused state instead of pulling it from the payload to ensure it's not stale.
        const isPaused = await isFollowerIndexPaused();
        // Pause follower if not already paused
        if (!isPaused) {
          await callWithRequest('ccr.pauseFollowerIndex', { id });
        }

        // Resume follower
        const body = removeEmptyFields(serializeAdvancedSettings(request.payload));
        return await callWithRequest('ccr.resumeFollowerIndex', { id, body });
      } catch (err) {
        if (isEsError(err)) {
          throw wrapEsError(err);
        }
        throw wrapUnknownError(err);
      }
    },
  });

  /**
   * Pauses a follower index
   */
  server.route({
    path: `${API_BASE_PATH}/follower_indices/{id}/pause`,
    method: 'PUT',
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
          callWithRequest('ccr.pauseFollowerIndex', { id: _id })
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
   * Resumes a follower index
   */
  server.route({
    path: `${API_BASE_PATH}/follower_indices/{id}/resume`,
    method: 'PUT',
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
          callWithRequest('ccr.resumeFollowerIndex', { id: _id })
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

  /**
   * Unfollow follower index's leader index
   */
  server.route({
    path: `${API_BASE_PATH}/follower_indices/{id}/unfollow`,
    method: 'PUT',
    config: {
      pre: [licensePreRouting],
    },
    handler: async request => {
      const callWithRequest = callWithRequestFactory(server, request);
      const { id } = request.params;
      const ids = id.split(',');

      const itemsUnfollowed = [];
      const itemsNotOpen = [];
      const errors = [];

      await Promise.all(
        ids.map(async _id => {
          try {
            // Try to pause follower, let it fail silently since it may already be paused
            try {
              await callWithRequest('ccr.pauseFollowerIndex', { id: _id });
            } catch (e) {
              // Swallow errors
            }

            // Close index
            await callWithRequest('indices.close', { index: _id });

            // Unfollow leader
            await callWithRequest('ccr.unfollowLeaderIndex', { id: _id });

            // Try to re-open the index, store failures in a separate array to surface warnings in the UI
            // This will allow users to query their index normally after unfollowing
            try {
              await callWithRequest('indices.open', { index: _id });
            } catch (e) {
              itemsNotOpen.push(_id);
            }

            // Push success
            itemsUnfollowed.push(_id);
          } catch (err) {
            if (isEsError(err)) {
              errors.push({ id: _id, error: wrapEsError(err) });
            } else {
              errors.push({ id: _id, error: wrapUnknownError(err) });
            }
          }
        })
      );

      return {
        itemsUnfollowed,
        itemsNotOpen,
        errors,
      };
    },
  });
};
