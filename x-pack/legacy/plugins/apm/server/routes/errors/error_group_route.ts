/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { withDefaultQueryParamValidators } from '../../lib/helpers/input_validation';
import {
  setupRequest,
  APMRequest,
  DefaultQueryParams
} from '../../lib/helpers/setup_request';
import { getErrorGroup } from '../../lib/errors/get_error_group';
import { PromiseReturnType } from '../../../typings/common';

export type ErrorGroupAPIResponse = PromiseReturnType<
  typeof errorGroupRoute['handler']
>;
export const errorGroupRoute = {
  method: 'GET',
  path: `/api/apm/services/{serviceName}/errors/{groupId}`,
  options: {
    validate: {
      query: withDefaultQueryParamValidators()
    },
    tags: ['access:apm']
  },
  handler: async (req: APMRequest<DefaultQueryParams>) => {
    const setup = await setupRequest(req);
    const { serviceName, groupId } = req.params;
    return getErrorGroup({ serviceName, groupId, setup });
  }
};
