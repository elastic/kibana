/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../../../src/core/server';
import { DETECTION_ENGINE_QUERY_SIGNALS_URL } from '../../../../../common/constants';
import { SignalsQueryRestParams } from '../../signals/types';
import { querySignalsSchema } from '../schemas/query_signals_index_schema';
import { transformError, buildRouteValidation, buildSiemResponse } from '../utils';

export const querySignalsRoute = (router: IRouter) => {
  router.post(
    {
      path: DETECTION_ENGINE_QUERY_SIGNALS_URL,
      validate: {
        body: buildRouteValidation<SignalsQueryRestParams>(querySignalsSchema),
      },
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
      const { query, aggs, _source, track_total_hits, size } = request.body;
      const clusterClient = context.core.elasticsearch.dataClient;
      const siemClient = context.siem.getSiemClient();
      const siemResponse = buildSiemResponse(response);

      try {
        const result = await clusterClient.callAsCurrentUser('search', {
          index: siemClient.signalsIndex,
          body: { query, aggs, _source, track_total_hits, size },
          ignoreUnavailable: true,
        });
        return response.ok({ body: result });
      } catch (err) {
        // error while getting or updating signal with id: id in signal index .siem-signals
        const error = transformError(err);
        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
