/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { DETECTION_ENGINE_QUERY_SIGNALS_URL } from '../../../../../common/constants';
import { LegacyGetScopedServices } from '../../../../services';
import { SignalsQueryRequest } from '../../signals/types';
import { querySignalsSchema } from '../schemas/query_signals_index_schema';
import { LegacySetupServices } from '../../../../plugin';
import { transformError, getIndex } from '../utils';

export const querySignalsRouteDef = (
  config: LegacySetupServices['config'],
  getServices: LegacyGetScopedServices
): Hapi.ServerRoute => {
  return {
    method: 'POST',
    path: DETECTION_ENGINE_QUERY_SIGNALS_URL,
    options: {
      tags: ['access:siem'],
      validate: {
        options: {
          abortEarly: false,
        },
        payload: querySignalsSchema,
      },
    },
    async handler(request: SignalsQueryRequest) {
      const { query, aggs, _source, track_total_hits, size } = request.payload;
      const { callCluster, getSpaceId } = await getServices(request);

      const index = getIndex(getSpaceId, config);

      try {
        return callCluster('search', {
          index,
          body: { query, aggs, _source, track_total_hits, size },
        });
      } catch (exc) {
        // error while getting or updating signal with id: id in signal index .siem-signals
        return transformError(exc);
      }
    },
  };
};

export const querySignalsRoute = (
  route: LegacySetupServices['route'],
  config: LegacySetupServices['config'],
  getServices: LegacyGetScopedServices
) => {
  route(querySignalsRouteDef(config, getServices));
};
