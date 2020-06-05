/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';
import {
  deserializeFollowerIndex,
  deserializeListFollowerIndices,
  serializeFollowerIndex,
  serializeAdvancedSettings,
  // @ts-ignore
} from '../../../../common/services/follower_index_serialization';
import { API_BASE_PATH } from '../../../../common/constants';
// @ts-ignore
import { removeEmptyFields } from '../../../../common/services/utils';
// @ts-ignore
import { callWithRequestFactory } from '../../lib/call_with_request_factory';
import { licensePreRoutingFactory } from '../../lib/license_pre_routing_factory';

import { RouteDependencies } from '../types';
import { mapErrorToKibanaHttpResponse } from '../map_to_kibana_http_error';

export const registerFollowerIndexRoutes = ({ router, __LEGACY }: RouteDependencies) => {
  /**
   * Returns a list of all follower indices
   */
  router.get(
    {
      path: `${API_BASE_PATH}/follower_indices`,
      validate: false,
    },
    licensePreRoutingFactory({
      __LEGACY,
      requestHandler: async (ctx, request, response) => {
        const callWithRequest = callWithRequestFactory(__LEGACY.server, request);

        try {
          const { follower_indices: followerIndices } = await callWithRequest('ccr.info', {
            id: '_all',
          });

          const {
            follow_stats: { indices: followerIndicesStats },
          } = await callWithRequest('ccr.stats');

          const followerIndicesStatsMap = followerIndicesStats.reduce((map: any, stats: any) => {
            map[stats.index] = stats;
            return map;
          }, {});

          const collatedFollowerIndices = followerIndices.map((followerIndex: any) => {
            return {
              ...followerIndex,
              ...followerIndicesStatsMap[followerIndex.follower_index],
            };
          });

          return response.ok({
            body: {
              indices: deserializeListFollowerIndices(collatedFollowerIndices),
            },
          });
        } catch (err) {
          return mapErrorToKibanaHttpResponse(err);
        }
      },
    })
  );

  /**
   * Returns a single follower index pattern
   */
  router.get(
    {
      path: `${API_BASE_PATH}/follower_indices/{id}`,
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
          const { follower_indices: followerIndices } = await callWithRequest('ccr.info', { id });

          const followerIndexInfo = followerIndices && followerIndices[0];

          if (!followerIndexInfo) {
            return response.notFound({
              body: `The follower index "${id}" does not exist.`,
            });
          }

          // If this follower is paused, skip call to ES stats api since it will return 404
          if (followerIndexInfo.status === 'paused') {
            return response.ok({
              body: deserializeFollowerIndex({
                ...followerIndexInfo,
              }),
            });
          } else {
            const {
              indices: followerIndicesStats,
            } = await callWithRequest('ccr.followerIndexStats', { id });

            return response.ok({
              body: deserializeFollowerIndex({
                ...followerIndexInfo,
                ...(followerIndicesStats ? followerIndicesStats[0] : {}),
              }),
            });
          }
        } catch (err) {
          return mapErrorToKibanaHttpResponse(err);
        }
      },
    })
  );

  /**
   * Create a follower index
   */
  router.post(
    {
      path: `${API_BASE_PATH}/follower_indices`,
      validate: {
        body: schema.object(
          {
            name: schema.string(),
          },
          { unknowns: 'allow' }
        ),
      },
    },
    licensePreRoutingFactory({
      __LEGACY,
      requestHandler: async (ctx, request, response) => {
        const callWithRequest = callWithRequestFactory(__LEGACY.server, request);
        const { name, ...rest } = request.body;
        const body = removeEmptyFields(serializeFollowerIndex(rest));

        try {
          return response.ok({
            body: await callWithRequest('ccr.saveFollowerIndex', { name, body }),
          });
        } catch (err) {
          return mapErrorToKibanaHttpResponse(err);
        }
      },
    })
  );

  /**
   * Edit a follower index
   */
  router.put(
    {
      path: `${API_BASE_PATH}/follower_indices/{id}`,
      validate: {
        params: schema.object({ id: schema.string() }),
        body: schema.object({
          maxReadRequestOperationCount: schema.maybe(schema.number()),
          maxOutstandingReadRequests: schema.maybe(schema.number()),
          maxReadRequestSize: schema.maybe(schema.string()), // byte value
          maxWriteRequestOperationCount: schema.maybe(schema.number()),
          maxWriteRequestSize: schema.maybe(schema.string()), // byte value
          maxOutstandingWriteRequests: schema.maybe(schema.number()),
          maxWriteBufferCount: schema.maybe(schema.number()),
          maxWriteBufferSize: schema.maybe(schema.string()), // byte value
          maxRetryDelay: schema.maybe(schema.string()), // time value
          readPollTimeout: schema.maybe(schema.string()), // time value
        }),
      },
    },
    licensePreRoutingFactory({
      __LEGACY,
      requestHandler: async (ctx, request, response) => {
        const callWithRequest = callWithRequestFactory(__LEGACY.server, request);
        const { id } = request.params;

        // We need to first pause the follower and then resume it passing the advanced settings
        try {
          const { follower_indices: followerIndices } = await callWithRequest('ccr.info', { id });
          const followerIndexInfo = followerIndices && followerIndices[0];
          if (!followerIndexInfo) {
            return response.notFound({ body: `The follower index "${id}" does not exist.` });
          }

          // Retrieve paused state instead of pulling it from the payload to ensure it's not stale.
          const isPaused = followerIndexInfo.status === 'paused';
          // Pause follower if not already paused
          if (!isPaused) {
            await callWithRequest('ccr.pauseFollowerIndex', { id });
          }

          // Resume follower
          const body = removeEmptyFields(serializeAdvancedSettings(request.body));
          return response.ok({
            body: await callWithRequest('ccr.resumeFollowerIndex', { id, body }),
          });
        } catch (err) {
          return mapErrorToKibanaHttpResponse(err);
        }
      },
    })
  );

  /**
   * Pauses a follower index
   */
  router.put(
    {
      path: `${API_BASE_PATH}/follower_indices/{id}/pause`,
      validate: {
        params: schema.object({ id: schema.string() }),
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
            callWithRequest('ccr.pauseFollowerIndex', { id: _id })
              .then(() => itemsPaused.push(_id))
              .catch((err: Error) => {
                errors.push({ id: _id, error: mapErrorToKibanaHttpResponse(err) });
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
   * Resumes a follower index
   */
  router.put(
    {
      path: `${API_BASE_PATH}/follower_indices/{id}/resume`,
      validate: {
        params: schema.object({ id: schema.string() }),
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
            callWithRequest('ccr.resumeFollowerIndex', { id: _id })
              .then(() => itemsResumed.push(_id))
              .catch((err: Error) => {
                errors.push({ id: _id, error: mapErrorToKibanaHttpResponse(err) });
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

  /**
   * Unfollow follower index's leader index
   */
  router.put(
    {
      path: `${API_BASE_PATH}/follower_indices/{id}/unfollow`,
      validate: {
        params: schema.object({ id: schema.string() }),
      },
    },
    licensePreRoutingFactory({
      __LEGACY,
      requestHandler: async (ctx, request, response) => {
        const callWithRequest = callWithRequestFactory(__LEGACY.server, request);
        const { id } = request.params;
        const ids = id.split(',');

        const itemsUnfollowed: string[] = [];
        const itemsNotOpen: string[] = [];
        const errors: Array<{ id: string; error: any }> = [];

        await Promise.all(
          ids.map(async (_id) => {
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
              errors.push({ id: _id, error: mapErrorToKibanaHttpResponse(err) });
            }
          })
        );

        return response.ok({
          body: {
            itemsUnfollowed,
            itemsNotOpen,
            errors,
          },
        });
      },
    })
  );
};
