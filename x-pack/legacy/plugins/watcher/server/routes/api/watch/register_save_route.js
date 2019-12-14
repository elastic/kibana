/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { WATCH_TYPES } from '../../../../common/constants';
import { serializeJsonWatch, serializeThresholdWatch } from '../../../../common/lib/serialization';
import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { isEsErrorFactory } from '../../../lib/is_es_error_factory';
import { wrapEsError, wrapUnknownError, wrapCustomError } from '../../../lib/error_wrappers';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';
import { i18n } from '@kbn/i18n';

function fetchWatch(callWithRequest, watchId) {
  return callWithRequest('watcher.getWatch', {
    id: watchId,
  });
}

function saveWatch(callWithRequest, id, body) {
  return callWithRequest('watcher.putWatch', {
    id,
    body,
  });
}

export function registerSaveRoute(server) {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/watcher/watch/{id}',
    method: 'PUT',
    handler: async request => {
      const callWithRequest = callWithRequestFactory(server, request);
      const { id, type, isNew, ...watchConfig } = request.payload;

      // For new watches, verify watch with the same ID doesn't already exist
      if (isNew) {
        const conflictError = wrapCustomError(
          new Error(
            i18n.translate('xpack.watcher.saveRoute.duplicateWatchIdErrorMessage', {
              defaultMessage: "There is already a watch with ID '{watchId}'.",
              values: {
                watchId: id,
              },
            })
          ),
          409
        );

        try {
          const existingWatch = await fetchWatch(callWithRequest, id);

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

      let serializedWatch;

      switch (type) {
        case WATCH_TYPES.JSON:
          const { name, watch } = watchConfig;
          serializedWatch = serializeJsonWatch(name, watch);
          break;

        case WATCH_TYPES.THRESHOLD:
          serializedWatch = serializeThresholdWatch(watchConfig);
          break;
      }

      // Create new watch
      return saveWatch(callWithRequest, id, serializedWatch).catch(err => {
        // Case: Error from Elasticsearch JS client
        if (isEsError(err)) {
          throw wrapEsError(err);
        }

        // Case: default
        throw wrapUnknownError(err);
      });
    },
    config: {
      pre: [licensePreRouting],
    },
  });
}
