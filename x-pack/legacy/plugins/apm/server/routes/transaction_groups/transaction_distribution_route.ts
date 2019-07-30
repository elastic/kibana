/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { withDefaultValidators } from '../../lib/helpers/input_validation';
import {
  setupRequest,
  APMRequest,
  DefaultQueryParams
} from '../../lib/helpers/setup_request';
import { getTransactionDistribution } from '../../lib/transactions/distribution';
import { PromiseReturnType } from '../../../typings/common';

interface Query extends DefaultQueryParams {
  transactionType: string;
  transactionName: string;
  transactionId?: string;
  traceId?: string;
}

export type TransactionDistributionAPIResponse = PromiseReturnType<
  typeof transactionDistributionRoute['handler']
>;
export const transactionDistributionRoute = {
  method: 'GET',
  path: `/api/apm/services/{serviceName}/transaction_groups/distribution`,
  options: {
    validate: {
      query: withDefaultValidators({
        transactionType: Joi.string().required(),
        transactionName: Joi.string().required(),
        transactionId: Joi.string(),
        traceId: Joi.string()
      })
    },
    tags: ['access:apm']
  },
  handler: async (req: APMRequest<Query>) => {
    const setup = await setupRequest(req);
    const { serviceName } = req.params;
    const {
      transactionType,
      transactionName,
      transactionId,
      traceId
    } = req.query;

    return getTransactionDistribution({
      serviceName,
      transactionType,
      transactionName,
      transactionId,
      traceId,
      setup
    });
  }
};
