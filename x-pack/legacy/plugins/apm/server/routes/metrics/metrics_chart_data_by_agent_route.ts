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
import { getMetricsChartDataByAgent } from '../../lib/metrics/get_metrics_chart_data_by_agent';

interface Query extends DefaultQueryParams {
  agentName: string;
}

export const metricsChartDataByAgentRoute = {
  method: 'GET',
  path: `/api/apm/services/{serviceName}/metrics/charts`,
  options: {
    validate: {
      query: withDefaultQueryParamValidators({
        agentName: Joi.string().required()
      })
    },
    tags: ['access:apm']
  },
  handler: async (req: APMRequest<Query>) => {
    const setup = await setupRequest(req);
    const { serviceName } = req.params;
    const { agentName } = req.query;
    return await getMetricsChartDataByAgent({
      setup,
      serviceName,
      agentName
    });
  }
};
