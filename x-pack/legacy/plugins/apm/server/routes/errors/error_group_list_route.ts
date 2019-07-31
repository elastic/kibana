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
import { getErrorGroupList } from '../../lib/errors/get_error_group_list';
import { PromiseReturnType } from '../../../typings/common';

interface Query extends DefaultQueryParams {
  sortField?: string;
  sortDirection?: string;
}

export type ErrorGroupListAPIResponse = PromiseReturnType<
  typeof errorGroupListRoute['handler']
>;

export const errorGroupListRoute = {
  method: 'GET',
  path: `/api/apm/services/{serviceName}/errors`,
  options: {
    validate: {
      query: withDefaultQueryParamValidators({
        sortField: Joi.string(),
        sortDirection: Joi.string()
      })
    },
    tags: ['access:apm']
  },
  handler: async (req: APMRequest<Query>) => {
    const setup = await setupRequest(req);
    const { serviceName } = req.params;
    const { sortField, sortDirection } = req.query;

    return getErrorGroupList({
      serviceName,
      sortField,
      sortDirection,
      setup
    });
  }
};
