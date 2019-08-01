/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { withDefaultQueryParamValidators } from '../../lib/helpers/input_validation';
import {
  APMRequest,
  setupRequest,
  DefaultQueryParams
} from '../../lib/helpers/setup_request';
import { getTrace } from '../../lib/traces/get_trace';
import { PromiseReturnType } from '../../../typings/common';

export type TraceAPIResponse = PromiseReturnType<typeof traceRoute['handler']>;
export const traceRoute = {
  method: 'GET',
  path: `/api/apm/traces/{traceId}`,
  options: {
    validate: {
      query: withDefaultQueryParamValidators()
    },
    tags: ['access:apm']
  },
  handler: async (req: APMRequest<DefaultQueryParams>) => {
    const { traceId } = req.params;
    const setup = await setupRequest(req);
    return getTrace(traceId, setup);
  }
};
