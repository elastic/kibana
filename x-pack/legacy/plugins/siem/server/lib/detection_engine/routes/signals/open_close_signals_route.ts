/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../../../src/core/server';
import { DETECTION_ENGINE_SIGNALS_STATUS_URL } from '../../../../../common/constants';
import { SignalsStatusRestParams } from '../../signals/types';
import { setSignalsStatusSchema } from '../schemas/set_signal_status_schema';
import { transformError, buildRouteValidation, buildSiemResponse } from '../utils';

export const setSignalsStatusRoute = (router: IRouter) => {
  router.post(
    {
      path: DETECTION_ENGINE_SIGNALS_STATUS_URL,
      validate: {
        body: buildRouteValidation<SignalsStatusRestParams>(setSignalsStatusSchema),
      },
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
      const { signal_ids: signalIds, query, status } = request.body;
      const clusterClient = context.core.elasticsearch.dataClient;
      const siemClient = context.siem.getSiemClient();
      const siemResponse = buildSiemResponse(response);

      let queryObject;
      if (signalIds) {
        queryObject = { ids: { values: signalIds } };
      }
      if (query) {
        queryObject = {
          bool: {
            filter: query,
          },
        };
      }
      try {
        const result = await clusterClient.callAsCurrentUser('updateByQuery', {
          index: siemClient.signalsIndex,
          body: {
            script: {
              source: `ctx._source.signal.status = '${status}'`,
              lang: 'painless',
            },
            query: queryObject,
          },
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
