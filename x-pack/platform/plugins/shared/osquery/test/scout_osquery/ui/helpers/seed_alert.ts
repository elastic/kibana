/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { EsClient, KbnClient } from '@kbn/scout';

/**
 * Direct-write detection-engine alerts into `.alerts-security.alerts-{spaceId}`
 * so UI specs can exercise the Alert Flyout + Osquery "Take Action" flow without
 * waiting on task-manager rule execution.
 *
 * Why: serverless task-manager latency between rule creation and the first
 * alert landing is unbounded in practice (observed 0–240 s). The poll helper
 * at `./poll_alerts.ts` masks that race but doesn't eliminate it. Seeding an
 * alert document directly removes task-manager as a failure dimension while
 * preserving the UI contract these specs actually exercise: "given an alert
 * for a rule, the flyout's Take Action menu surfaces Run Osquery and the
 * submitted live query attaches to the alert".
 *
 * Contract sources:
 *   - Required fields: @kbn/alerts-as-data-utils/src/schemas/generated/security_schema.ts
 *     (SecurityAlertRequired, lines 72–120).
 *   - Osquery menu gating: the Take Action dropdown reads `agent.id` via
 *     `dataFormattedForFieldBrowser`
 *     (security_solution/public/flyout/document_details/shared/components/take_action_dropdown.tsx:278–300).
 *     `agent.id` MUST be present and reference a Fleet-enrolled Osquery agent;
 *     the rule's own `response_actions` only gates the *automatic* post-alert
 *     execution, not the manual Take Action flow.
 *   - Write target: `DEFAULT_ALERTS_INDEX = '.alerts-security.alerts'` is the
 *     alias (security_solution/common/constants.ts:57); we write to the
 *     concrete per-space data stream backing it.
 */

const DETECTION_ENGINE_INDEX_URL = '/api/detection_engine/index';

/** ALWAYS use the concrete per-space data stream name so we can scope delete-by-query too. */
export const alertsIndexForSpace = (spaceId: string = 'default'): string =>
  `.alerts-security.alerts-${spaceId}`;

/**
 * Bootstrap the `.alerts-security.alerts-{spaceId}` data stream and its
 * component/index templates. Idempotent — safe to invoke once per spec.
 *
 * Uses `POST /api/detection_engine/index`, which installs the rule_registry
 * templates without requiring any rule to have run. Returns 200 the first time
 * and on subsequent calls (security_solution handles the "already installed"
 * case).
 */
export async function bootstrapSecurityAlertsIndex(
  kbnClient: KbnClient,
  spaceId?: string
): Promise<void> {
  const basePath = spaceId && spaceId !== 'default' ? `/s/${spaceId}` : '';
  await kbnClient.request({
    method: 'POST',
    path: `${basePath}${DETECTION_ENGINE_INDEX_URL}`,
    ignoreErrors: [409],
  });
}

export interface SeedAlertInput {
  ruleId: string;
  ruleName: string;
  agentId: string;
  hostName?: string;
  spaceId?: string;
  /** Overrides `@timestamp` / `kibana.alert.original_time`; defaults to now. */
  timestampIso?: string;
}

/**
 * Direct-indexes a single detection-engine alert document keyed to the given
 * rule and agent. Returns the alert's `kibana.alert.uuid`.
 *
 * The document carries the minimum set of fields from `SecurityAlertRequired`
 * plus `agent.id` / `host.name` / `event.kind: 'signal'`, which is what the
 * alerts table + flyout read from. Uses `refresh: 'wait_for'` so the doc is
 * query-visible immediately on return.
 */
export async function seedAlertForRule(
  esClient: EsClient,
  { ruleId, ruleName, agentId, hostName, spaceId, timestampIso }: SeedAlertInput
): Promise<string> {
  const alertUuid = randomUUID();
  const timestamp = timestampIso ?? new Date().toISOString();
  const effectiveSpaceId = spaceId ?? 'default';
  const host = hostName ?? 'scout-host';

  await esClient.index({
    index: alertsIndexForSpace(effectiveSpaceId),
    refresh: 'wait_for',
    op_type: 'create',
    id: alertUuid,
    document: {
      '@timestamp': timestamp,
      'agent.id': agentId,
      'agent.type': 'endpoint',
      'host.name': host,
      'event.kind': 'signal',
      'event.action': 'scout-seeded-alert',
      'ecs.version': '8.11.0',

      // SecurityAlertRequired — keep parity with the schema; missing any of
      // these produces "strict_dynamic_mapping_exception" on index.
      'kibana.alert.ancestors': [
        {
          depth: 0,
          id: `scout-source-${alertUuid}`,
          index: 'logs-endpoint.events.process-default',
          type: 'event',
        },
      ],
      'kibana.alert.depth': 1,
      'kibana.alert.instance.id': alertUuid,
      'kibana.alert.original_event.action': 'scout-seeded-alert',
      'kibana.alert.original_event.category': ['process'],
      'kibana.alert.original_event.created': timestamp,
      'kibana.alert.original_event.dataset': 'endpoint.events.process',
      'kibana.alert.original_event.id': `scout-evt-${alertUuid}`,
      'kibana.alert.original_event.ingested': timestamp,
      'kibana.alert.original_event.kind': 'event',
      'kibana.alert.original_event.module': 'endpoint',
      'kibana.alert.original_event.original': 'scout',
      'kibana.alert.original_event.outcome': 'success',
      'kibana.alert.original_event.provider': 'elastic',
      'kibana.alert.original_event.sequence': 0,
      'kibana.alert.original_event.type': ['start'],
      'kibana.alert.original_time': timestamp,
      'kibana.alert.rule.category': 'Custom Query Rule',
      'kibana.alert.rule.consumer': 'siem',
      'kibana.alert.rule.false_positives': [],
      'kibana.alert.rule.max_signals': [100],
      'kibana.alert.rule.name': ruleName,
      'kibana.alert.rule.producer': 'siem',
      'kibana.alert.rule.revision': 1,
      'kibana.alert.rule.rule_type_id': 'siem.queryRule',
      'kibana.alert.rule.threat.framework': 'MITRE ATT&CK',
      'kibana.alert.rule.threat.tactic.id': 'TA0001',
      'kibana.alert.rule.threat.tactic.name': 'Initial Access',
      'kibana.alert.rule.threat.tactic.reference': 'https://attack.mitre.org/tactics/TA0001/',
      'kibana.alert.rule.threat.technique.id': 'T1566',
      'kibana.alert.rule.threat.technique.name': 'Phishing',
      'kibana.alert.rule.threat.technique.reference': 'https://attack.mitre.org/techniques/T1566/',
      'kibana.alert.rule.threat.technique.subtechnique.id': 'T1566.001',
      'kibana.alert.rule.threat.technique.subtechnique.name': 'Spearphishing Attachment',
      'kibana.alert.rule.threat.technique.subtechnique.reference':
        'https://attack.mitre.org/techniques/T1566/001/',
      'kibana.alert.rule.uuid': ruleId,
      'kibana.alert.status': 'active',
      'kibana.alert.uuid': alertUuid,
      'kibana.space_ids': [effectiveSpaceId],
      'kibana.alert.workflow_status': 'open',
    },
  });

  return alertUuid;
}

/**
 * Delete-by-query cleanup for alerts this helper created. Safe to call in
 * `afterAll` even if no alerts were seeded — returns 0-match silently.
 */
export async function deleteSeededAlerts(
  esClient: EsClient,
  ruleId: string,
  spaceId?: string
): Promise<void> {
  await esClient.deleteByQuery(
    {
      index: alertsIndexForSpace(spaceId ?? 'default'),
      refresh: true,
      conflicts: 'proceed',
      query: { term: { 'kibana.alert.rule.uuid': ruleId } },
    },
    { ignore: [404] }
  );
}
