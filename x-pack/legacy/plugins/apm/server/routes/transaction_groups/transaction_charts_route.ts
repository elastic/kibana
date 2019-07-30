/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { withDefaultValidators } from '../../lib/helpers/input_validation';
import { getTransactionCharts } from '../../lib/transactions/charts';
import {
  setupRequest,
  APMRequest,
  DefaultQueryParams
} from '../../lib/helpers/setup_request';
import { PromiseReturnType } from '../../../typings/common';

interface Query extends DefaultQueryParams {
  transactionType?: string;
  transactionName?: string;
}

export type TransactionChartsAPIResponse = PromiseReturnType<
  typeof transactionChartsRoute['handler']
>;
export const transactionChartsRoute = {
  method: 'GET',
  path: `/api/apm/services/{serviceName}/transaction_groups/charts`,
  options: {
    validate: {
      query: withDefaultValidators({
        transactionType: Joi.string(),
        transactionName: Joi.string()
      })
    },
    tags: ['access:apm']
  },
  handler: async (req: APMRequest<Query>) => {
    const setup = await setupRequest(req);
    const { serviceName } = req.params;
    const { transactionType, transactionName } = req.query;

    return getTransactionCharts({
      serviceName,
      transactionType,
      transactionName,
      setup
    });
  }
};
