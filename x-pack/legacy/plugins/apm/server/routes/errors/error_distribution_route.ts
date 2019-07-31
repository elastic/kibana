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
import { getErrorDistribution } from '../../lib/errors/distribution/get_distribution';
import { PromiseReturnType } from '../../../typings/common';

interface Query extends DefaultQueryParams {
  groupId?: string;
}

export type ErrorDistributionAPIResponse = PromiseReturnType<
  typeof errorDistributionRoute['handler']
>;
export const errorDistributionRoute = {
  method: 'GET',
  path: `/api/apm/services/{serviceName}/errors/distribution`,
  options: {
    validate: {
      query: withDefaultQueryParamValidators({
        groupId: Joi.string()
      })
    },
    tags: ['access:apm']
  },
  handler: async (req: APMRequest<Query>) => {
    const setup = await setupRequest(req);
    const { serviceName } = req.params;
    const { groupId } = req.query;
    return getErrorDistribution({ serviceName, groupId, setup });
  }
};
