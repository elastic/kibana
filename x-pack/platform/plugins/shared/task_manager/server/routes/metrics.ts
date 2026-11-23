/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IRouter,
  Logger,
  RequestHandlerContext,
  KibanaRequest,
  IKibanaResponse,
  KibanaResponseFactory,
  IClusterClient,
} from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { Observable, Subject } from 'rxjs';
import type { Metrics } from '../metrics';
import { checkMonitoringPrivileges } from '../lib/check_monitoring_privileges';
import { redactMetrics } from '../lib/redact_monitoring_stats';

export interface NodeMetrics {
  process_uuid: string;
  timestamp: string;
  last_update: string;
  metrics: Metrics['metrics'] | null;
}

export interface MetricsRouteParams {
  router: IRouter;
  logger: Logger;
  metrics$: Observable<Metrics>;
  resetMetrics$: Subject<boolean>;
  taskManagerId: string;
  kibanaIndexName: string;
  getClusterClient: () => Promise<IClusterClient>;
  getIsSecurityEnabled: () => boolean;
}

const QuerySchema = schema.object({
  reset: schema.boolean({ defaultValue: true }),
});

export function metricsRoute(params: MetricsRouteParams) {
  const {
    router,
    logger,
    metrics$,
    resetMetrics$,
    taskManagerId,
    kibanaIndexName,
    getClusterClient,
    getIsSecurityEnabled,
  } = params;

  let lastMetrics: NodeMetrics | null = null;

  metrics$.subscribe((metrics) => {
    lastMetrics = { process_uuid: taskManagerId, timestamp: new Date().toISOString(), ...metrics };
  });

  router.get(
    {
      path: `/api/task_manager/metrics`,
      security: {
        authz: {
          enabled: false,
          reason:
            'This route is opted out from authorization. It can be accessed with JWT credentials.',
        },
      },
      options: {
        access: 'public',
        // The `security:acceptJWT` tag allows route to be accessed with JWT credentials. It points to
        // ROUTE_TAG_ACCEPT_JWT from '@kbn/security-plugin/server' that cannot be imported here directly.
        tags: ['security:acceptJWT'],
      },
      // Uncomment when we determine that we can restrict API usage to Global admins based on telemetry
      // security: {
      //   authz: {
      //     requiredPrivileges: ['taskManager'],
      //   },
      // },
      validate: {
        query: QuerySchema,
      },
    },
    async function (
      _: RequestHandlerContext,
      req: KibanaRequest<unknown, TypeOf<typeof QuerySchema>, unknown>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse> {
      const { isPrivileged } = await checkMonitoringPrivileges({
        request: req,
        getClusterClient,
        kibanaIndexName,
        getIsSecurityEnabled,
        logger,
      });

      if (req.query.reset && isPrivileged) {
        resetMetrics$.next(true);
      }

      if (!lastMetrics) {
        return res.ok({
          body: { process_uuid: taskManagerId, timestamp: new Date().toISOString(), metrics: {} },
        });
      }

      return res.ok({ body: isPrivileged ? lastMetrics : redactMetrics(lastMetrics) });
    }
  );
}
