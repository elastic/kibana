/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, RouteSecurity } from '@kbn/core-http-server';
import { inject, injectable } from 'inversify';
import { Request } from '@kbn/core-di-server';
import { z } from '@kbn/zod/v4';
import type { CreateRuleData } from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { BaseAlertingRoute } from '../base_alerting_route';
import { AlertingRouteContext } from '../alerting_route_context';
import { RulesClient } from '../../lib/rules_client';

const SEED_RULES: Array<{ id: string; data: CreateRuleData }> = [
  // --- Deduplication targets ---
  // These two rules both detect service errors from the same logs index
  // but use different filtering approaches (severity_text vs body.text LIKE).
  {
    id: 'rule-doctor-seed-error-severity',
    data: {
      kind: 'alert',
      metadata: {
        name: 'Service error logs (severity)',
        description:
          'Detects services producing error-level logs using the severity_text field.',
        tags: ['logs', 'errors', 'services'],
      },
      time_field: '@timestamp',
      schedule: { every: '5m' },
      evaluation: {
        query: {
          base: 'FROM remote_cluster:logs-*.otel-* | WHERE severity_text == "ERROR" | STATS error_count = COUNT(*) BY resource.attributes.service.name | WHERE error_count > 10',
        },
      },
      state_transition: {
        pending_count: 2,
        pending_operator: 'AND',
      },
      grouping: { fields: ['resource.attributes.service.name'] },
    },
  },
  {
    id: 'rule-doctor-seed-error-body-dup',
    data: {
      kind: 'alert',
      metadata: {
        name: 'Service error logs (body text)',
        description:
          'Legacy error detection rule — scans log body text for error keywords.',
        tags: ['logs', 'errors'],
      },
      time_field: '@timestamp',
      schedule: { every: '5m' },
      evaluation: {
        query: {
          base: 'FROM remote_cluster:logs-*.otel-* | WHERE body.text LIKE "*error*" | STATS error_count = COUNT(*) BY resource.attributes.service.name | WHERE error_count > 5',
        },
      },
      state_transition: {
        pending_count: 1,
        pending_operator: 'AND',
      },
    },
  },
  // These two rules both monitor log volume per pod but with different thresholds.
  {
    id: 'rule-doctor-seed-pod-log-volume',
    data: {
      kind: 'alert',
      metadata: {
        name: 'High pod log volume',
        description:
          'Detects pods generating excessive log output, which may indicate issues.',
        tags: ['logs', 'kubernetes', 'volume'],
      },
      time_field: '@timestamp',
      schedule: { every: '5m' },
      evaluation: {
        query: {
          base: 'FROM remote_cluster:logs-*.otel-* | WHERE k8s.pod.name IS NOT NULL | STATS log_count = COUNT(*) BY k8s.pod.name | WHERE log_count > 100000',
        },
      },
      state_transition: {
        pending_count: 2,
        pending_operator: 'AND',
      },
      grouping: { fields: ['k8s.pod.name'] },
    },
  },
  {
    id: 'rule-doctor-seed-pod-log-volume-dup',
    data: {
      kind: 'alert',
      metadata: {
        name: 'Pod log flood > 50k',
        description:
          'Legacy pod log flood rule — fires when a pod emits more than 50k logs.',
        tags: ['logs', 'kubernetes'],
      },
      time_field: '@timestamp',
      schedule: { every: '5m' },
      evaluation: {
        query: {
          base: 'FROM remote_cluster:logs-*.otel-* | WHERE k8s.pod.name IS NOT NULL | STATS log_count = COUNT(*) BY k8s.pod.name | WHERE log_count > 50000',
        },
      },
      state_transition: {
        pending_count: 1,
        pending_operator: 'AND',
      },
    },
  },
  // --- Threshold Tuning targets ---
  {
    id: 'rule-doctor-seed-error-log-noisy',
    data: {
      kind: 'alert',
      metadata: {
        name: 'Service error logs > 5',
        description: 'Detects services with high volumes of error-level logs.',
        tags: ['logs', 'errors', 'services'],
      },
      time_field: '@timestamp',
      schedule: { every: '1m' },
      evaluation: {
        query: {
          base: 'FROM remote_cluster:logs-*.otel-* | WHERE severity_text == "ERROR" | STATS error_count = COUNT(*) BY resource.attributes.service.name | WHERE error_count > 5',
        },
      },
      state_transition: {
        pending_count: 1,
        pending_operator: 'AND',
      },
      grouping: { fields: ['resource.attributes.service.name'] },
    },
  },
  {
    id: 'rule-doctor-seed-exception-high-thresh',
    data: {
      kind: 'alert',
      metadata: {
        name: 'Service exceptions > 10000',
        description:
          'Detects services with extremely high exception counts. Threshold is very high.',
        tags: ['logs', 'exceptions', 'services'],
      },
      time_field: '@timestamp',
      schedule: { every: '5m' },
      evaluation: {
        query: {
          base: 'FROM remote_cluster:logs-*.otel-* | WHERE attributes.exception.message IS NOT NULL | STATS exc_count = COUNT(*) BY resource.attributes.service.name | WHERE exc_count > 10000',
        },
      },
      state_transition: {
        pending_count: 3,
        pending_operator: 'AND',
      },
      grouping: { fields: ['resource.attributes.service.name'] },
    },
  },
  // --- Stale Rule targets ---
  {
    id: 'rule-doctor-seed-warn-stale',
    data: {
      kind: 'alert',
      metadata: {
        name: 'Service warning logs > 100',
        description:
          'Legacy warning log monitor. Created during initial infrastructure setup. Disabled because it was too noisy.',
        tags: ['logs', 'warnings', 'legacy'],
      },
      time_field: '@timestamp',
      schedule: { every: '10m' },
      evaluation: {
        query: {
          base: 'FROM remote_cluster:logs-*.otel-* | WHERE severity_text == "WARN" | STATS warn_count = COUNT(*) BY resource.attributes.service.name | WHERE warn_count > 100',
        },
      },
      grouping: { fields: ['resource.attributes.service.name'] },
    },
  },
  {
    id: 'rule-doctor-seed-node-logs-stale',
    data: {
      kind: 'alert',
      metadata: {
        name: 'Node log volume threshold',
        description:
          'Legacy node-level log volume monitoring. Created 18 months ago during initial cluster setup.',
        tags: ['logs', 'kubernetes', 'legacy'],
      },
      time_field: '@timestamp',
      schedule: { every: '10m' },
      evaluation: {
        query: {
          base: 'FROM remote_cluster:logs-*.otel-* | WHERE k8s.node.name IS NOT NULL | STATS log_count = COUNT(*) BY k8s.node.name | WHERE log_count > 1000000',
        },
      },
      grouping: { fields: ['k8s.node.name'] },
    },
  },
  // --- Coverage Gap enrichment ---
  {
    id: 'rule-doctor-seed-ns-log-volume',
    data: {
      kind: 'alert',
      metadata: {
        name: 'Namespace log volume by service',
        description:
          'Detects services generating excessive logs within a Kubernetes namespace.',
        tags: ['logs', 'kubernetes', 'namespaces'],
      },
      time_field: '@timestamp',
      schedule: { every: '5m' },
      evaluation: {
        query: {
          base: 'FROM remote_cluster:logs-*.otel-* | WHERE k8s.namespace.name IS NOT NULL | STATS log_count = COUNT(*) BY k8s.namespace.name, resource.attributes.service.name | WHERE log_count > 50000',
        },
      },
      grouping: { fields: ['k8s.namespace.name', 'resource.attributes.service.name'] },
    },
  },
];

const responseSchema = z.object({
  created: z.array(z.string()),
});

@injectable()
export class SeedRulesRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = '/internal/alerting/v2/rule_doctor/_seed';
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.rules.write],
    },
  };
  static routeOptions = {
    access: 'internal' as const,
    summary: 'Seed sample rules for Rule Doctor testing',
  };
  static validate = {
    request: {},
    response: {
      200: {
        body: () => responseSchema,
        description: 'Seed rules created successfully.',
      },
    },
  };

  protected readonly routeName = 'seed rule doctor rules';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(Request) private readonly request: KibanaRequest,
    @inject(RulesClient) private readonly rulesClient: RulesClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const seedIds = SEED_RULES.map(({ id }) => id);

    try {
      await this.rulesClient.bulkDeleteRules({ ids: seedIds });
      this.ctx.logger.info(`Deleted ${seedIds.length} existing seed rules`);
    } catch (e) {
      this.ctx.logger.debug(`Bulk delete of seed rules failed (may not exist yet): ${(e as Error).message}`);
    }

    const created: string[] = [];

    for (const { id, data } of SEED_RULES) {
      const rule = await this.rulesClient.createRule({ data, options: { id } });
      created.push(rule.id);
    }

    if (created.length > 0) {
      await this.rulesClient.bulkDisableRules({ ids: created });
      this.ctx.logger.info(`Disabled ${created.length} seed rules to prevent execution`);
    }

    return this.ctx.response.ok({
      body: { created },
    });
  }
}
