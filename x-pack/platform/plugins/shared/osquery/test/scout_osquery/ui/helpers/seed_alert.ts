/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { EsClient, KbnClient } from '@kbn/scout';

/**
 * Index a minimal detection alert directly (bypasses task-manager latency).
 * Needs `agent.id` + nested `host.os.name` for Take Action → Osquery; optional
 * `embeddedDetectionRuleBody` mirrors rule fields when no rule SO exists.
 */

const DETECTION_ENGINE_INDEX_URL = '/api/detection_engine/index';

/** Concrete per-space alerts data stream (not the alias). */
export const alertsIndexForSpace = (spaceId: string = 'default'): string =>
  `.alerts-security.alerts-${spaceId}`;

/** Fallback when Fleet has not reported `os.name`; must match agent `os_version.name`. */
export const SCOUT_ALERT_HOST_OS_NAME_FALLBACK = 'Ubuntu';

/** Idempotent: `POST /api/detection_engine/index` installs alerts templates for the space. */
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
  /** Prefer Fleet `local_metadata.os.name` from `getFirstOnlineAgent`. */
  hostOsName?: string;
  spaceId?: string;
  /** Optional fixed timestamp (defaults to now). */
  timestampIso?: string;
  /** Optional rule create payload merged into `kibana.alert.rule.*` when no rule SO. */
  embeddedDetectionRuleBody?: Record<string, unknown>;
}

export interface SeedAlertResult {
  alertId: string;
  timestampIso: string;
  indexName: string;
}

/** Maps detection rule create fields onto `kibana.alert.rule.*`. */
function embeddedRuleFieldsFromDetectionBody(
  ruleId: string,
  ruleName: string,
  body: Record<string, unknown>
): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    'kibana.alert.rule.id': ruleId,
    'kibana.alert.rule.uuid': ruleId,
    'kibana.alert.rule.name': typeof body.name === 'string' ? body.name : ruleName,
  };

  if (typeof body.note === 'string') {
    fields['kibana.alert.rule.note'] = body.note;
  }

  if (typeof body.description === 'string') {
    fields['kibana.alert.rule.description'] = body.description;
  }

  if (Array.isArray(body.response_actions)) {
    fields['kibana.alert.rule.response_actions'] = body.response_actions;
  }

  if (Array.isArray(body.index)) {
    fields['kibana.alert.rule.index'] = body.index;
  }

  if (typeof body.language === 'string') {
    fields['kibana.alert.rule.language'] = body.language;
  }

  if (typeof body.query === 'string') {
    fields['kibana.alert.rule.query'] = body.query;
  }

  if (typeof body.type === 'string') {
    fields['kibana.alert.rule.type'] = body.type;
  }

  if (typeof body.from === 'string') {
    fields['kibana.alert.rule.from'] = body.from;
  }

  if (typeof body.to === 'string') {
    fields['kibana.alert.rule.to'] = body.to;
  }

  if (typeof body.interval === 'string') {
    fields['kibana.alert.rule.interval'] = body.interval;
  }

  if (typeof body.enabled === 'boolean') {
    fields['kibana.alert.rule.enabled'] = body.enabled;
  }

  if (typeof body.throttle === 'string') {
    fields['kibana.alert.rule.throttle'] = body.throttle;
  }

  if (Array.isArray(body.actions)) {
    fields['kibana.alert.rule.actions'] = body.actions;
  }

  if (Array.isArray(body.filters)) {
    fields['kibana.alert.rule.filters'] = body.filters;
  }

  return fields;
}

/** Index one alert with SecurityAlertRequired-shaped fields; `refresh: 'wait_for'`. */
export async function seedAlertForRule(
  esClient: EsClient,
  {
    ruleId,
    ruleName,
    agentId,
    hostName,
    hostOsName,
    spaceId,
    timestampIso,
    embeddedDetectionRuleBody,
  }: SeedAlertInput
): Promise<SeedAlertResult> {
  const alertUuid = randomUUID();
  const timestamp = timestampIso ?? new Date().toISOString();
  const effectiveSpaceId = spaceId ?? 'default';
  const host = hostName ?? 'scout-host';
  const resolvedHostOsName = hostOsName ?? SCOUT_ALERT_HOST_OS_NAME_FALLBACK;
  const indexName = alertsIndexForSpace(effectiveSpaceId);

  const embeddedFields = embeddedDetectionRuleBody
    ? embeddedRuleFieldsFromDetectionBody(ruleId, ruleName, embeddedDetectionRuleBody)
    : {};

  await esClient.index({
    index: indexName,
    refresh: 'wait_for',
    op_type: 'create',
    id: alertUuid,
    document: {
      '@timestamp': timestamp,
      agent: {
        id: agentId,
        type: 'endpoint',
      },
      host: {
        name: host,
        os: {
          name: resolvedHostOsName,
        },
      },
      'event.kind': 'signal',
      'event.action': 'scout-seeded-alert',
      'ecs.version': '8.11.0',

      // SecurityAlertRequired (schema parity — avoid strict_dynamic_mapping_exception)
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
      ...embeddedFields,
    },
  });

  return { alertId: alertUuid, timestampIso: timestamp, indexName };
}

/** Delete alerts for `ruleId` in the space index (no-op if none). */
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
