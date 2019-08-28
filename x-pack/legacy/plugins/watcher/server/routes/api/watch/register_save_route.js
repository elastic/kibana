/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { Watch } from '../../../models/watch';
import { isEsErrorFactory } from '../../../lib/is_es_error_factory';
import { wrapEsError, wrapUnknownError, wrapCustomError } from '../../../lib/error_wrappers';
import { licensePreRoutingFactory } from'../../../lib/license_pre_routing_factory';
import { i18n } from '@kbn/i18n';

function fetchWatch(callWithRequest, watchId) {
  return callWithRequest('watcher.getWatch', {
    id: watchId
  });
}

function saveWatch(callWithRequest, watch) {
  return callWithRequest('watcher.putWatch', {
    id: watch.id,
    body: watch.watch
  });
}

export function registerSaveRoute(server) {

  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/watcher/watch/{id}',
    method: 'PUT',
    handler: async (request) => {
      const callWithRequest = callWithRequestFactory(server, request);
      const watchPayload = request.payload;

      // For new watches, verify watch with the same ID doesn't already exist
      if (watchPayload.isNew) {
        const conflictError = wrapCustomError(
          new Error(i18n.translate('xpack.watcher.saveRoute.duplicateWatchIdErrorMessage', {
            defaultMessage: 'There is already a watch with ID \'{watchId}\'.',
            values: {
              watchId: watchPayload.id,
            }
          })),
          409
        );

        try {
          const existingWatch = await fetchWatch(callWithRequest, watchPayload.id);

          if (existingWatch.found) {
            throw conflictError;
          }
        } catch (e) {
          // Rethrow conflict error but silently swallow all others
          if (e === conflictError) {
            throw e;
          }
        }
      }

      const watchFromDownstream = Watch.fromDownstreamJson(watchPayload);

      // Create new watch
      return saveWatch(callWithRequest, watchFromDownstream.upstreamJson)
        .catch(err => {
          // Case: Error from Elasticsearch JS client
          if (isEsError(err)) {
            throw wrapEsError(err);
          }

          // Case: default
          throw wrapUnknownError(err);
        });
    },
    config: {
      pre: [ licensePreRouting ]
    }
  });
}
