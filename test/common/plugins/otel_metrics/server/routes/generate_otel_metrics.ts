/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IKibanaResponse, IRouter } from '@kbn/core/server';
import { Metrics } from '../monitoring/metrics';

export const generateOtelMetrics = (router: IRouter, metrics: Metrics) => {
  router.post(
    {
      path: '/api/generate_otel_metrics',
      validate: {},
    },
    async function (_context, _req, res): Promise<IKibanaResponse<{}>> {
      metrics.requestCounter.add(1);
      return res.ok({});
    }
  );
};
