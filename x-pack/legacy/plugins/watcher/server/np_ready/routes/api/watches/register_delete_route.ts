/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RequestHandler } from 'src/core/server';
import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';
import { RouteDependencies, ServerShim } from '../../../types';

function deleteWatches(callWithRequest: any, watchIds: string[]) {
  const deletePromises = watchIds.map(watchId => {
    return callWithRequest('watcher.deleteWatch', {
      id: watchId,
    })
      .then((success: Array<{ _id: string }>) => ({ success }))
      .catch((error: Array<{ _id: string }>) => ({ error }));
  });

  return Promise.all(deletePromises).then(results => {
    const errors: Error[] = [];
    const successes: boolean[] = [];
    results.forEach(({ success, error }) => {
      if (success) {
        successes.push(success._id);
      } else if (error) {
        errors.push(error._id);
      }
    });

    return {
      successes,
      errors,
    };
  });
}

export function registerDeleteRoute(deps: RouteDependencies, legacy: ServerShim) {
  const handler: RequestHandler<any, any, any> = async (ctx, request, response) => {
    const callWithRequest = callWithRequestFactory(deps.elasticsearchService, request);

    try {
      const results = await deleteWatches(callWithRequest, request.body.watchIds);
      return response.ok({ body: { results } });
    } catch (e) {
      return response.internalError({ body: e });
    }
  };

  deps.router.post(
    {
      path: '/api/watcher/watches/delete',
      validate: {
        body: schema.object({
          watchIds: schema.arrayOf(schema.string()),
        }),
      },
    },
    licensePreRoutingFactory(legacy, handler)
  );
}
