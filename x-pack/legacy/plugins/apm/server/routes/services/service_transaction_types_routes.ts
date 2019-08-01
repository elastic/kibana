/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getServiceTransactionTypes } from '../../lib/services/get_service_transaction_types';
import { withDefaultQueryParamValidators } from '../../lib/helpers/input_validation';
import {
  DefaultQueryParams,
  APMRequest,
  setupRequest
} from '../../lib/helpers/setup_request';

export const serviceTransactionTypesRoute = {
  method: 'GET',
  path: `/api/apm/services/{serviceName}/transaction_types`,
  options: {
    validate: {
      query: withDefaultQueryParamValidators()
    },
    tags: ['access:apm']
  },
  handler: async (req: APMRequest<DefaultQueryParams>) => {
    const setup = await setupRequest(req);
    const { serviceName } = req.params;
    return getServiceTransactionTypes(serviceName, setup);
  }
};
