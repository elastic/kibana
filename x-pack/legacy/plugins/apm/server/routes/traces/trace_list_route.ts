/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { withDefaultQueryParamValidators } from '../../lib/helpers/input_validation';
import {
  DefaultQueryParams,
  APMRequest,
  setupRequest
} from '../../lib/helpers/setup_request';
import { getTransactionGroupList } from '../../lib/transaction_groups';

export const traceListRoute = {
  method: 'GET',
  path: '/api/apm/traces',
  options: {
    validate: {
      query: withDefaultQueryParamValidators()
    },
    tags: ['access:apm']
  },
  handler: async (req: APMRequest<DefaultQueryParams>) => {
    const setup = await setupRequest(req);
    return getTransactionGroupList({ type: 'top_traces' }, setup);
  }
};
