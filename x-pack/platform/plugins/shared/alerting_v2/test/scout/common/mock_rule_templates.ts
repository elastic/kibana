/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleTemplateData } from '@kbn/alerting-v2-schemas';
import { buildRuleTemplateData } from './builders';
import type { RuleTemplatesApiService } from './services/rule_templates_api_service';

export interface MockRuleTemplate {
  /** Saved object id, which is also the id the rule library installs from. */
  id: string;
  attributes: RuleTemplateData;
}

export const MOCK_RULE_TEMPLATES = {
  nginxErrorRate: {
    id: 'mock-nginx-error-rate',
    attributes: buildRuleTemplateData({
      kind: 'alert',
      metadata: {
        name: 'Nginx high 5xx error rate',
        description: 'Alerts when more than 5% of nginx responses are server errors.',
        tags: ['nginx', 'observability'],
      },
      schedule: { every: '1m', lookback: '5m' },
      query: {
        base: 'FROM logs-nginx.access-* | STATS error_rate = AVG(CASE(http.response.status_code >= 500, 1.0, 0.0)) BY host.name',
        breach: { segment: 'WHERE error_rate > 0.05' },
      },
      grouping: { fields: ['host.name'] },
      state_transition: { pending: { count: 3 }, recovering: { count: 2 } },
    }),
  },
  kubernetesPodRestarts: {
    id: 'mock-kubernetes-pod-restarts',
    attributes: buildRuleTemplateData({
      kind: 'alert',
      metadata: {
        name: 'Kubernetes pod CrashLoopBackOff',
        description: 'Alerts when containers have a high restart count.',
        tags: ['kubernetes', 'infrastructure'],
      },
      schedule: { every: '1m', lookback: '15m' },
      query: {
        base: 'TS metrics-* | STATS restarts = MAX(k8s.container.restarts) BY k8s.pod.name',
        breach: { segment: 'WHERE restarts > 0 | SORT restarts DESC | LIMIT 50' },
      },
      grouping: { fields: ['k8s.pod.name'] },
      state_transition: { pending: { count: 3 }, recovering: { count: 0 } },
    }),
  },
  hostCpuUsage: {
    id: 'mock-host-cpu-usage',
    attributes: buildRuleTemplateData({
      kind: 'alert',
      metadata: {
        name: 'Host CPU usage is high',
        description: 'Alerts when average CPU utilization stays above 90%.',
        tags: ['infrastructure', 'host', 'cpu'],
      },
      schedule: { every: '5m', lookback: '15m' },
      query: {
        base: 'FROM metrics-system.cpu-* | STATS cpu = AVG(system.cpu.total.norm.pct) BY host.name',
        breach: { segment: 'WHERE cpu > 0.9' },
      },
      grouping: { fields: ['host.name'] },
      no_data: { strategy: 'ignore' },
    }),
  },
  diskUsage: {
    id: 'mock-disk-usage',
    attributes: buildRuleTemplateData({
      kind: 'alert',
      // No description and a single tag, so the library renders the sparse case.
      metadata: { name: 'Disk usage is high', tags: ['infrastructure'] },
      schedule: { every: '5m', lookback: '30m' },
      query: {
        base: 'FROM metrics-system.filesystem-* | STATS used = MAX(system.filesystem.used.pct) BY host.name, system.filesystem.mount_point',
        breach: { segment: 'WHERE used > 0.85' },
      },
      grouping: { fields: ['host.name', 'system.filesystem.mount_point'] },
    }),
  },
  failedLogins: {
    id: 'mock-failed-logins',
    attributes: buildRuleTemplateData({
      kind: 'signal',
      metadata: {
        name: 'Repeated failed logins',
        description: 'Emits a signal when a user fails to authenticate several times.',
        tags: ['security', 'authentication'],
      },
      schedule: { every: '5m', lookback: '10m' },
      query: {
        base: 'FROM logs-system.auth-* | WHERE event.outcome == "failure" | STATS failures = COUNT(*) BY user.name',
        breach: { segment: 'WHERE failures >= 5' },
      },
      grouping: { fields: ['user.name'] },
      recovery: undefined,
      no_data: undefined,
      state_transition: undefined,
    }),
  },
  untaggedErrorLogs: {
    id: 'mock-untagged-error-logs',
    attributes: buildRuleTemplateData({
      kind: 'signal',
      // No tags, so the library renders an empty tags column.
      metadata: { name: 'Error log spike' },
      schedule: { every: '1m', lookback: '5m' },
      query: {
        base: 'FROM logs-* | WHERE log.level == "error" | STATS errors = COUNT(*)',
        breach: { segment: 'WHERE errors > 100' },
      },
      grouping: undefined,
      recovery: undefined,
      no_data: undefined,
      state_transition: undefined,
    }),
  },
} as const satisfies Record<string, MockRuleTemplate>;

export const MOCK_RULE_TEMPLATE_LIST: readonly MockRuleTemplate[] =
  Object.values(MOCK_RULE_TEMPLATES);

/** Seeds every mock template, replacing any with the same id. */
export const seedMockRuleTemplates = async (
  ruleTemplates: Pick<RuleTemplatesApiService, 'create'>,
  templates: readonly MockRuleTemplate[] = MOCK_RULE_TEMPLATE_LIST
): Promise<void> => {
  await Promise.all(
    templates.map(({ id, attributes }) => ruleTemplates.create({ id, attributes }))
  );
};
