/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { withDefaultQueryParamValidators } from '../../lib/helpers/input_validation';
import {
  setupRequest,
  APMRequest,
  DefaultQueryParams
} from '../../lib/helpers/setup_request';
import { getTransactionBreakdown } from '../../lib/transactions/breakdown';
import { PromiseReturnType } from '../../../typings/common';

interface Query extends DefaultQueryParams {
  transactionName?: string;
  transactionType: string;
}

export type TransactionBreakdownAPIResponse = PromiseReturnType<
  typeof transactionBreakdownRoute['handler']
>;
export const transactionBreakdownRoute = {
  method: 'GET',
  path: `/api/apm/services/{serviceName}/transaction_groups/breakdown`,
  options: {
    validate: {
      query: withDefaultQueryParamValidators({
        transactionName: Joi.string(),
        transactionType: Joi.string().required()
      })
    }
  },
  handler: async (req: APMRequest<Query>) => {
    const setup = await setupRequest(req);
    const { serviceName } = req.params;
    const { transactionName, transactionType } = req.query;

    return getTransactionBreakdown({
      serviceName,
      transactionName,
      transactionType,
      setup
    });
  }
};
