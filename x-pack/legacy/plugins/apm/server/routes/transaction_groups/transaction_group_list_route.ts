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
import { getTransactionGroupList } from '../../lib/transaction_groups';
import { PromiseReturnType } from '../../../typings/common';

interface Query extends DefaultQueryParams {
  transactionType: string;
}

export type TransactionGroupListAPIResponse = PromiseReturnType<
  typeof transactionGroupListRoute['handler']
>;

export const transactionGroupListRoute = {
  method: 'GET',
  path: '/api/apm/services/{serviceName}/transaction_groups',
  options: {
    validate: {
      query: withDefaultQueryParamValidators({
        transactionType: Joi.string().required()
      })
    },
    tags: ['access:apm']
  },
  handler: async (req: APMRequest<Query>) => {
    const { serviceName } = req.params;
    const { transactionType } = req.query;
    const setup = await setupRequest(req);

    return getTransactionGroupList(
      {
        type: 'top_transactions',
        serviceName,
        transactionType
      },
      setup
    );
  }
};
