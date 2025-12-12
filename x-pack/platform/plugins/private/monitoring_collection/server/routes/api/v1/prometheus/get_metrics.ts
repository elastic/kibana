/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { PrometheusExporter } from '@kbn/metrics';
import { MONITORING_COLLECTION_BASE_PATH } from '../../../../constants';

export const PROMETHEUS_PATH = `${MONITORING_COLLECTION_BASE_PATH}/v1/prometheus`;
export function registerV1PrometheusRoute({
  router,
  prometheusExporter,
}: {
  router: IRouter;
  prometheusExporter: PrometheusExporter;
}) {
  router.get(
    {
      path: PROMETHEUS_PATH,
      security: {
        authz: {
          enabled: false,
          reason:
            'This route is opted out from authorization because it is not interacting with ES at all',
        },
      },
      options: {
        authRequired: true,
        tags: ['api'], // ensures that unauthenticated calls receive a 401 rather than a 302 redirect to login page
      },
      validate: {},
    },
    async (_context, _req, res) => {
      return prometheusExporter.exportMetrics(res);
    }
  );
}
