/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * TEMPORARY perf-test scaffolding — do not merge / not for production.
 *
 * Bulk-creates N signal ES|QL rules that stream a large result set, to saturate
 * a single Kibana node and validate the alerting v2 streaming approach.
 * `createRule` already enables and schedules each rule, so no separate enable
 * step is needed. Hit from Dev Tools:
 *
 *   POST kbn:/internal/alerting/v2/_perf/load_rules
 *   { "count": 100 }
 *
 * On Cloud, prefer calling in chunks (e.g. count 500-1000 per request) to stay
 * under gateway timeouts. Requires `xpack.alerting_v2.rules.maxScheduledPerMinute`
 * to be raised, otherwise enabling is rejected with MAX_SCHEDULES_PER_MINUTE_EXCEEDED.
 *
 * Remove this file and its `bind(Route)` entry in `server/setup/bind_routes.ts`
 * before merging.
 */

import type { RouteSecurity } from '@kbn/core-http-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { inject, injectable } from 'inversify';
import { Request } from '@kbn/core-di-server';
import { z } from '@kbn/zod/v4';
import type { CreateRuleData } from '@kbn/alerting-v2-schemas';

import { RulesClient } from '../../lib/rules_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { AlertingRouteContext } from '../alerting_route_context';
import { BaseAlertingRoute } from '../base_alerting_route';

const LOAD_RULES_API_PATH = '/internal/alerting/v2/_perf/load_rules';

const loadRulesBodySchema = z.object({
  count: z.number().int().min(1).max(50_000),
  index: z.string().min(1).default('perf-esql-source'),
  every: z.string().min(1).default('1m'),
  // Capped at MAX_DURATION (365d) by the rule schema; still far longer than any test run.
  lookback: z.string().min(1).default('365d'),
  tag: z.string().min(1).default('perf-esql'),
  concurrency: z.number().int().min(1).max(100).default(20),
});

type LoadRulesBody = z.infer<typeof loadRulesBodySchema>;

@injectable()
export class LoadRulesRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = LOAD_RULES_API_PATH;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.write],
    },
  };
  static routeOptions = {
    access: 'internal',
    summary: 'Bulk-create ES|QL perf-test rules (temporary)',
  } as const;
  static schemas = {
    request: {
      body: loadRulesBodySchema,
    },
  };

  protected readonly routeName = 'load perf rules';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request) private readonly request: KibanaRequest<unknown, unknown, LoadRulesBody>,
    @inject(RulesClient) private readonly rulesClient: RulesClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const { count, index, every, lookback, tag, concurrency } = this.request.body;
    const batchId = Date.now().toString(36);
    const query = `FROM ${index} | KEEP @timestamp, host.name, message`;

    const makeData = (i: number): CreateRuleData => ({
      kind: 'signal',
      metadata: { name: `perf-esql-${batchId}-${i}`, tags: [tag] },
      time_field: '@timestamp',
      schedule: { every, lookback },
      query: { format: 'standalone', breach: { query } },
    });

    let created = 0;
    const failures: Array<{ index: number; message: string }> = [];

    for (let start = 0; start < count; start += concurrency) {
      const end = Math.min(start + concurrency, count);
      const results = await Promise.allSettled(
        Array.from({ length: end - start }, (_, k) =>
          this.rulesClient.createRule({ data: makeData(start + k) })
        )
      );

      results.forEach((result, k) => {
        if (result.status === 'fulfilled') {
          created++;
        } else {
          const reason = result.reason;
          failures.push({
            index: start + k,
            message: reason instanceof Error ? reason.message : String(reason),
          });
        }
      });
    }

    return this.ctx.response.ok({
      body: {
        requested: count,
        created,
        failed: failures.length,
        // Cap the echoed failures so the response stays small under heavy load.
        failures: failures.slice(0, 20),
      },
    });
  }
}
