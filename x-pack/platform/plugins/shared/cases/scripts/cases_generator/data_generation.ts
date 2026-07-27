/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { CaseSeverity, type CasePostRequest } from '../../common';
import { buildKitchenSinkExtendedFields } from './kitchen_sink_template';
import type { LegacyCaseCustomFieldValue } from './configure_customfields';
import type { CreatedTemplateRef, TemplateFieldUserType } from './types';
import { AUTO_GENERATED_TAG, extendedFieldKey, pick, randomString, rng, sampleN } from './utils';

const EXTENDED_FIELD_SAMPLE_TEXT = [
  'Investigation pending triage',
  'Awaiting customer confirmation',
  'Reproducible in staging only',
  'Suspected configuration drift',
  'No customer impact observed',
];

// Returns a random sample value appropriate for the given template field
// control. Used by buildExtendedFields when populating extended_fields on
// templated cases so each field gets a believable value.
function randomExtendedFieldValue(userType: TemplateFieldUserType): string {
  switch (userType) {
    case 'text':
      return `demo-${randomString(6)}`;
    case 'number':
      return String(Math.floor(rng() * 1_000) + 1);
    case 'textarea':
      return pick(EXTENDED_FIELD_SAMPLE_TEXT);
    case 'date': {
      const now = Date.now();
      const offset = Math.floor(rng() * 90 * 24 * 3_600_000);
      return new Date(now - offset).toISOString();
    }
    case 'select':
    case 'radio':
      return pick(['alpha', 'beta', 'gamma']);
    case 'checkbox':
      return JSON.stringify(sampleN(['alpha', 'beta'], Math.max(1, Math.floor(rng() * 2) + 1)));
    case 'user':
      return JSON.stringify([]);
  }
}

// Builds the extended_fields object a case POST needs when it's based on a
// template, with one entry per template field. Called by buildCaseRequest when
// a template was assigned to the case. Kitchen-sink templates carry the real
// field defs (names, types, options, validation) so values can match the
// definition exactly; the synthesized --templateFieldTypes path falls back to
// the fieldA/fieldB style keys derived from the user-type list.
function buildExtendedFields(template: CreatedTemplateRef): Record<string, string> {
  if (template.kitchenSinkFields && template.kitchenSinkFields.length > 0) {
    return buildKitchenSinkExtendedFields(template.kitchenSinkFields);
  }
  const result: Record<string, string> = {};
  template.fieldTypes.forEach((userType, idx) => {
    result[extendedFieldKey(idx, userType)] = randomExtendedFieldValue(userType);
  });
  return result;
}

const ENDPOINT_EVENTS_NAMESPACE = 'default';

// Returns the alerts index this script writes into for a given owner+space.
// Observability cases land in the metrics alerts index; security/cases owners
// land in the security alerts index. Called by indexAlertsForOwners and the
// security/observability alert generators.
export function getAlertsIndex(owner: string, space: string): string {
  const spaceId = space || 'default';
  if (owner === 'observability') {
    return `.alerts-observability.metrics.alerts-${spaceId}`;
  }
  return `.alerts-security.alerts-${spaceId}`;
}

// Returns the endpoint process events data stream this script writes into.
// Used by run.ts and bulkIndexEvents when --events > 0.
export function getEventsIndex(): string {
  return `logs-endpoint.events.process-${ENDPOINT_EVENTS_NAMESPACE}`;
}

export interface DocGeneratorContext {
  space: string;
  kibanaVersion: string;
}

// Builds a single security-style alert document (with the fields the security
// alerts UI needs) ready for ES bulk indexing. Called by bulkIndexAlerts when
// the owner is `securitySolution` or `cases`. `alertNum` is used only to
// number the synthetic rule name.
export function generateSecurityAlert(alertNum: number, ctx: DocGeneratorContext) {
  const now = new Date();
  const alertId = uuidv4();
  const ruleId = uuidv4();
  const spaceId = ctx.space || 'default';
  const severities = ['low', 'medium', 'high', 'critical'];
  const hostnames = ['host-alpha', 'host-beta', 'host-gamma', 'host-delta'];
  const usernames = ['admin', 'root', 'operator', 'analyst'];
  const processNames = ['malware.exe', 'suspicious.sh', 'backdoor.py', 'crypto_miner'];

  const severity = pick(severities);
  const hostname = pick(hostnames);
  const username = pick(usernames);
  const processName = pick(processNames);

  return {
    _id: alertId,
    ruleId,
    ruleName: `Generated Rule ${alertNum + 1}`,
    _source: {
      '@timestamp': now.toISOString(),
      'kibana.alert.uuid': alertId,
      'kibana.alert.status': 'active',
      'kibana.alert.rule.uuid': ruleId,
      'kibana.alert.rule.rule_id': ruleId,
      'kibana.alert.rule.name': `Generated Rule ${alertNum + 1}`,
      'kibana.alert.rule.description': `${processName} detected on ${hostname} by ${username}`,
      'kibana.alert.rule.category': 'Custom Query Rule',
      'kibana.alert.rule.consumer': 'siem',
      'kibana.alert.rule.rule_type_id': 'siem.queryRule',
      'kibana.alert.rule.producer': 'siem',
      'kibana.alert.severity': severity,
      'kibana.alert.risk_score': Math.floor(rng() * 100),
      'kibana.alert.workflow_status': 'open',
      'kibana.alert.reason': `${processName} detected on ${hostname} by ${username}`,
      'kibana.alert.original_time': new Date(
        now.getTime() - Math.floor(rng() * 3_600_000)
      ).toISOString(),
      'kibana.alert.start': now.toISOString(),
      'kibana.space_ids': [spaceId],
      'kibana.version': ctx.kibanaVersion,
    },
  };
}

// Builds a metrics-style observability alert document ready for ES bulk
// indexing. Called by bulkIndexAlerts when the owner is `observability`.
// Only metrics rule types are emitted because every observability alert in
// this script is written to the metrics alerts index.
export function generateObservabilityAlert(alertNum: number, ctx: DocGeneratorContext) {
  const now = new Date();
  const alertId = uuidv4();
  const ruleId = uuidv4();
  const spaceId = ctx.space || 'default';

  // Only metrics-style rule types are emitted because indexAlertsForOwners writes every
  // observability alert to `.alerts-observability.metrics.alerts-*`. Mixing in log-threshold
  // rule types would route log alerts into the metrics index where the logs alerts UI
  // would never see them.
  const ruleTypes = [
    {
      ruleTypeId: 'metrics.alert.threshold',
      category: 'Metric threshold',
      actionGroup: 'metrics.threshold.fired',
      producer: 'infrastructure',
    },
    {
      ruleTypeId: 'metrics.alert.inventory.threshold',
      category: 'Inventory',
      actionGroup: 'metrics.threshold.fired',
      producer: 'infrastructure',
    },
  ];

  const hosts = ['host-0', 'host-1', 'host-2', 'host-3', 'host-4'];
  const metrics = [
    { name: 'system.cpu.pct', value: (rng() * 100).toFixed(1), unit: '%', threshold: '10' },
    {
      name: 'system.memory.pct',
      value: (rng() * 100).toFixed(1),
      unit: '%',
      threshold: '80',
    },
    { name: 'system.load.1', value: (rng() * 20).toFixed(2), unit: '', threshold: '5' },
    {
      name: 'system.disk.pct',
      value: (rng() * 100).toFixed(1),
      unit: '%',
      threshold: '90',
    },
  ];

  const ruleType = pick(ruleTypes);
  const host = pick(hosts);
  const metric = pick(metrics);

  const reason = `${metric.name} is ${metric.value}${metric.unit} in the last 1 min for ${host}. Alert when > ${metric.threshold}${metric.unit}.`;
  const ruleName = `${ruleType.category} Rule ${alertNum + 1}`;

  return {
    _id: alertId,
    ruleId,
    ruleName,
    _source: {
      '@timestamp': now.toISOString(),
      'kibana.alert.uuid': alertId,
      'kibana.alert.status': 'active',
      'kibana.alert.workflow_status': 'open',
      'kibana.alert.reason': reason,
      'kibana.alert.severity': pick(['warning', 'critical']),
      'kibana.alert.rule.uuid': ruleId,
      'kibana.alert.rule.rule_id': ruleId,
      'kibana.alert.rule.name': ruleName,
      'kibana.alert.rule.category': ruleType.category,
      'kibana.alert.rule.consumer': ruleType.producer,
      'kibana.alert.rule.producer': ruleType.producer,
      'kibana.alert.rule.rule_type_id': ruleType.ruleTypeId,
      'kibana.alert.rule.execution.uuid': uuidv4(),
      'kibana.alert.action_group': ruleType.actionGroup,
      'kibana.alert.instance.id': host,
      'kibana.alert.start': now.toISOString(),
      'kibana.alert.duration.us': Math.floor(rng() * 300_000_000),
      'kibana.alert.evaluation.value': parseFloat(metric.value),
      'kibana.alert.evaluation.threshold': parseFloat(metric.threshold),
      'event.kind': 'signal',
      'event.action': 'active',
      'kibana.space_ids': [spaceId],
      'kibana.version': ctx.kibanaVersion,
      'kibana.alert.flapping': false,
    },
  };
}

// Builds a single ECS-style process event document ready for ES bulk
// indexing into the endpoint events data stream. Called by bulkIndexEvents to
// produce the pool of events that get attached to non-observability cases.
export function generateProcessEvent(ctx: DocGeneratorContext) {
  const now = new Date();
  const eventId = uuidv4();
  const hostnames = ['zeek-sensor-sf', 'zeek-sensor-ams', 'suricata-sensor-sf', 'endpoint-host'];
  const processInfos = [
    { name: 'sshd', executable: '/usr/sbin/sshd', args: ['sshd: [net]'] },
    { name: 'java', executable: '/usr/share/elasticsearch/jdk/bin/java', args: ['java', '-Xms4g'] },
    { name: 'cron', executable: '/usr/sbin/cron', args: ['/usr/sbin/cron', '-f'] },
    { name: 'nginx', executable: '/usr/sbin/nginx', args: ['nginx: worker process'] },
    { name: 'python3', executable: '/usr/bin/python3', args: ['python3', 'app.py'] },
    { name: 'node', executable: '/usr/bin/node', args: ['node', 'server.js'] },
  ];
  const usernames = ['root', 'sshd', 'www-data', 'elastic'];
  const eventActions = ['process_started', 'process_stopped', 'exec', 'fork'];
  const eventTypes: string[][] = [['start'], ['end'], ['start'], ['info']];

  const hostname = pick(hostnames);
  const proc = pick(processInfos);
  const username = pick(usernames);
  const eventAction = pick(eventActions);
  const idx = eventActions.indexOf(eventAction);
  const pid = Math.floor(rng() * 65_535) + 1;

  return {
    '@timestamp': now.toISOString(),
    agent: {
      id: uuidv4(),
      type: pick(['auditbeat', 'endpoint']),
      version: ctx.kibanaVersion,
      hostname,
    },
    ecs: { version: '1.4.0' },
    event: {
      action: eventAction,
      dataset: 'process',
      kind: 'event',
      module: 'system',
      category: ['process'],
      type: eventTypes[idx >= 0 ? idx : 0],
      id: eventId,
    },
    host: { hostname, id: uuidv4(), name: hostname },
    process: {
      entity_id: uuidv4(),
      executable: proc.executable,
      name: proc.name,
      pid,
      ppid: Math.floor(rng() * 65_535) + 1,
      start: new Date(now.getTime() - Math.floor(rng() * 3_600_000)).toISOString(),
      args: proc.args,
    },
    user: { name: username },
    message: `Process ${proc.name} (PID: ${pid}) by ${username} ${eventAction.toUpperCase()}`,
    data_stream: {
      type: 'logs',
      dataset: 'endpoint.events.process',
      namespace: ENDPOINT_EVENTS_NAMESPACE,
    },
  };
}

const CASE_TAG_POOL = [
  'production',
  'staging',
  'incident',
  'investigating',
  'p0',
  'p1',
  'p2',
  'rca-needed',
  'duplicate',
  'follow-up',
];
const CASE_CATEGORY_POOL: Array<string | null> = [
  'Network',
  'Endpoint',
  'Identity',
  'Cloud',
  'Application',
  null,
];
const CASE_SEVERITIES = [
  CaseSeverity.LOW,
  CaseSeverity.MEDIUM,
  CaseSeverity.HIGH,
  CaseSeverity.CRITICAL,
];

// Optional knobs for buildCaseRequest. Add new options (e.g. connector
// overrides) here as the generator grows.
export interface BuildCaseRequestOptions {
  // Typed customFields the script registered on the configure SO via
  // --legacyCustomFields. When supplied, the request body's `customFields`
  // array is set to these values so the case persists with valid typed
  // entries that match the configure SO's registration.
  legacyCustomFieldValues?: LegacyCaseCustomFieldValue[];
}

// Builds the body of a single POST /api/cases request, with random tags,
// severity, and category. Called by run.ts (one call per case) when assembling
// the per-space batch. When `template` is provided the case is linked to that
// template and gets matching extended_fields. When
// `options.legacyCustomFieldValues` is provided the case carries typed
// customFields matching the configure SO's registration.
export function buildCaseRequest(
  counter: number,
  owner: string,
  reqId: string,
  template?: CreatedTemplateRef | null,
  options?: BuildCaseRequestOptions
): CasePostRequest {
  const sampledTags = sampleN(CASE_TAG_POOL, Math.floor(rng() * 3));
  const legacyCustomFieldValues = options?.legacyCustomFieldValues ?? [];
  const request: CasePostRequest = {
    title: `[${owner}] Sample Case ${reqId}-${counter}`,
    tags: [AUTO_GENERATED_TAG, ...sampledTags],
    severity: pick(CASE_SEVERITIES),
    description: `Auto generated case ${counter} (request ${reqId}, owner ${owner})`,
    assignees: [],
    connector: {
      id: 'none',
      name: 'none',
      type: '.none',
      fields: null,
    } as CasePostRequest['connector'],
    settings: { syncAlerts: false, extractObservables: false },
    owner: owner ?? 'cases',
    customFields: legacyCustomFieldValues as CasePostRequest['customFields'],
    category: pick(CASE_CATEGORY_POOL),
  };
  if (template) {
    (
      request as CasePostRequest & {
        template?: { id: string; version: number };
        extended_fields?: Record<string, string>;
      }
    ).template = {
      id: template.id,
      version: template.version,
    };
    const hasFields =
      template.fieldTypes.length > 0 ||
      (template.kitchenSinkFields !== undefined && template.kitchenSinkFields.length > 0);
    if (hasFields) {
      (request as CasePostRequest & { extended_fields?: Record<string, string> }).extended_fields =
        buildExtendedFields(template);
    }
  }
  return request;
}
