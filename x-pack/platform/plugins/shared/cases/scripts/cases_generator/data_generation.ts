/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { CaseSeverity, type CasePostRequest } from '../../common';
import { AUTO_GENERATED_TAG, pick, rng, sampleN } from './utils';

const ENDPOINT_EVENTS_NAMESPACE = 'default';

export function getAlertsIndex(owner: string, space: string): string {
  const spaceId = space || 'default';
  if (owner === 'observability') {
    return `.alerts-observability.metrics.alerts-${spaceId}`;
  }
  return `.alerts-security.alerts-${spaceId}`;
}

export function getEventsIndex(): string {
  return `logs-endpoint.events.process-${ENDPOINT_EVENTS_NAMESPACE}`;
}

export interface DocGeneratorContext {
  space: string;
  kibanaVersion: string;
}

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

export function buildCaseRequest(counter: number, owner: string, reqId: string): CasePostRequest {
  const sampledTags = sampleN(CASE_TAG_POOL, Math.floor(rng() * 3));
  return {
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
    customFields: [],
    category: pick(CASE_CATEGORY_POOL),
  };
}

