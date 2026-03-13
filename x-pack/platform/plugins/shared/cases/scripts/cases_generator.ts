/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import { Client, HttpConnection } from '@elastic/elasticsearch';
import type { ClientOptions } from '@elastic/elasticsearch/lib/client';
import { KbnClient } from '@kbn/test';
import { CA_CERT_PATH } from '@kbn/dev-utils';
import { ToolingLog } from '@kbn/tooling-log';
import type { KbnClientOptions } from '@kbn/test';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import readline from 'readline';
import pMap from 'p-map';
import yargs from 'yargs';
import yaml from 'js-yaml';
import { CaseSeverity, type CasePostRequest } from '../common';

// ─── Logger ────────────────────────────────────────────────────────────────────

const logger = new ToolingLog({ level: 'info', writeTo: process.stdout });

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AlertInfo {
  alertId: string;
  index: string;
  ruleId: string;
  ruleName: string;
}

interface EventInfo {
  eventId: string;
  index: string;
}

interface CreatedAttachment {
  caseId: string;
  owner: string;
  type: 'user' | 'alert' | 'event';
  comment?: string;
  alertId?: string;
  eventId?: string;
  index?: string;
  rule?: { id: string; name: string };
}

interface TemplateInput {
  name: string;
  description?: string;
  tags?: string[];
}

interface GeneratorConfig {
  kibana: string;
  node: string;
  username: string;
  password: string;
  ssl: boolean;
  apiKey: string;
  space: string;
  owners: string[];
  count: number;
  comments: number;
  alerts: number;
  events: number;
  templates: TemplateInput[];
  /** Owner(s) to create templates for; defaults to config.owners */
  templateOwners: string[];
  /** Space to create templates in; defaults to config.space */
  templateSpace: string;
}

const VALID_OWNERS = ['securitySolution', 'observability', 'cases'] as const;

// ─── Utility Helpers ───────────────────────────────────────────────────────────

/** Generates a short random alphanumeric string. */
const randomString = (length: number) =>
  Math.random()
    .toString(36)
    .substring(2, length + 2);

/** Picks a random element from an array. */
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/** Updates the username, password, and/or protocol of a URL string. */
function updateURL({
  url,
  user,
  protocol,
}: {
  url: string;
  user?: { username: string; password: string };
  protocol?: string;
}): string {
  const urlObject = new URL(url);
  if (user) {
    urlObject.username = user.username;
    urlObject.password = user.password;
  }
  if (protocol) {
    urlObject.protocol = protocol;
  }
  return urlObject.href;
}

// ─── Client Factories ──────────────────────────────────────────────────────────

/**
 * Creates a KbnClient for making Kibana API requests, plus auth headers.
 * Handles SSL certificate setup when connecting to HTTPS Kibana instances.
 */
function createKbnClient({
  url,
  username,
  password,
  ssl,
  apiKey,
}: {
  url: string;
  username: string;
  password: string;
  ssl: boolean;
  apiKey?: string;
}): { kbnClient: KbnClient; headers: Record<string, string> } {
  let updatedUrl = updateURL({ url, user: { username, password } });

  let kbnClientOptions: KbnClientOptions = { log: logger, url: updatedUrl };

  if (ssl) {
    const ca = fs.readFileSync(CA_CERT_PATH);
    updatedUrl = updateURL({ url: updatedUrl, user: { username, password }, protocol: 'https:' });
    kbnClientOptions = { ...kbnClientOptions, certificateAuthorities: [ca], url: updatedUrl };
  }

  const kbnClient = new KbnClient(kbnClientOptions);
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers.Authorization = `ApiKey ${apiKey}`;
  }

  return { kbnClient, headers };
}

/**
 * Creates an Elasticsearch client for direct ES operations (bulk indexing alerts/events).
 * Handles SSL certificate setup when connecting to HTTPS ES nodes.
 */
function createEsClient({
  node,
  ssl,
  username,
  password,
}: {
  node: string;
  ssl: boolean;
  username: string;
  password: string;
}): Client {
  let clientOptions: ClientOptions = {
    Connection: HttpConnection,
    node,
    auth: { username, password },
    requestTimeout: 60_000,
  };

  if (ssl) {
    const ca = fs.readFileSync(CA_CERT_PATH);
    const httpsNode = updateURL({ url: node, protocol: 'https:' });
    clientOptions = { ...clientOptions, node: httpsNode, tls: { ca: [ca] } };
  }

  return new Client(clientOptions);
}

// ─── Index Name Helpers ────────────────────────────────────────────────────────

/**
 * Returns the alerts index for a given owner and space.
 * - securitySolution → .alerts-security.alerts-{space}
 * - observability    → .alerts-observability.metrics.alerts-{space}
 * - cases            → .alerts-security.alerts-{space} (fallback)
 */
function getAlertsIndex(owner: string, space: string): string {
  const spaceId = space || 'default';
  if (owner === 'observability') {
    return `.alerts-observability.metrics.alerts-${spaceId}`;
  }
  return `.alerts-security.alerts-${spaceId}`;
}

/**
 * Returns the events index for a given space.
 * Events are indexed into the Endpoint process events data stream.
 */
function getEventsIndex(space: string): string {
  const spaceId = space || 'default';
  return `logs-endpoint.events.process-${spaceId}`;
}

// ─── Document Generators ───────────────────────────────────────────────────────
// Each generator produces a realistic document shape that matches what Kibana's
// alerting framework would create. Documents include only managed-mapping fields
// (kibana.alert.*) to avoid dynamic-mapping conflicts.

/**
 * Generates a security alert document (SIEM / custom query rule style).
 * Fields match the alerting framework's managed index mappings.
 */
function generateSecurityAlert(alertNum: number) {
  const now = new Date();
  const alertId = uuidv4();
  const ruleId = uuidv4();
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
      'kibana.alert.risk_score': Math.floor(Math.random() * 100),
      'kibana.alert.workflow_status': 'open',
      'kibana.alert.reason': `${processName} detected on ${hostname} by ${username}`,
      'kibana.alert.original_time': new Date(
        now.getTime() - Math.floor(Math.random() * 3600000)
      ).toISOString(),
      'kibana.alert.start': now.toISOString(),
      'kibana.space_ids': ['default'],
      'kibana.version': '9.1.0',
    },
  };
}

/**
 * Generates an observability alert document (metric threshold / log threshold style).
 * Modeled after infrastructure and logs alerting framework managed mappings.
 */
function generateObservabilityAlert(alertNum: number) {
  const now = new Date();
  const alertId = uuidv4();
  const ruleId = uuidv4();

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
    {
      ruleTypeId: 'logs.alert.document.count',
      category: 'Log threshold',
      actionGroup: 'logs.threshold.fired',
      producer: 'logs',
    },
  ];

  const hosts = ['host-0', 'host-1', 'host-2', 'host-3', 'host-4'];
  const services = ['web-service', 'api-gateway', 'payment-service', 'auth-service'];
  const metrics = [
    { name: 'system.cpu.pct', value: (Math.random() * 100).toFixed(1), unit: '%', threshold: '10' },
    {
      name: 'system.memory.pct',
      value: (Math.random() * 100).toFixed(1),
      unit: '%',
      threshold: '80',
    },
    { name: 'system.load.1', value: (Math.random() * 20).toFixed(2), unit: '', threshold: '5' },
    {
      name: 'system.disk.pct',
      value: (Math.random() * 100).toFixed(1),
      unit: '%',
      threshold: '90',
    },
  ];

  const ruleType = pick(ruleTypes);
  const host = pick(hosts);
  const service = pick(services);
  const metric = pick(metrics);
  const isLogThreshold = ruleType.category === 'Log threshold';
  const logEntryCount = Math.floor(Math.random() * 500);

  const reason = isLogThreshold
    ? `${logEntryCount} log entries exceeded threshold of 100 in the last 5 min for ${service}`
    : `${metric.name} is ${metric.value}${metric.unit} in the last 1 min for ${host}. Alert when > ${metric.threshold}${metric.unit}.`;

  const ruleName = isLogThreshold
    ? `Log Threshold Rule ${alertNum + 1}`
    : `${ruleType.category} Rule ${alertNum + 1}`;

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
      'kibana.alert.rule.consumer': 'alerts',
      'kibana.alert.rule.producer': ruleType.producer,
      'kibana.alert.rule.rule_type_id': ruleType.ruleTypeId,
      'kibana.alert.rule.execution.uuid': uuidv4(),
      'kibana.alert.action_group': ruleType.actionGroup,
      'kibana.alert.instance.id': isLogThreshold ? service : host,
      'kibana.alert.start': now.toISOString(),
      'kibana.alert.duration.us': Math.floor(Math.random() * 300000000),
      'kibana.alert.evaluation.value': parseFloat(metric.value),
      'kibana.alert.evaluation.threshold': parseFloat(metric.threshold),
      'event.kind': 'signal',
      'event.action': 'active',
      'kibana.space_ids': ['default'],
      'kibana.version': '9.1.0',
      'kibana.alert.flapping': false,
    },
  };
}

/**
 * Generates a process event document (ECS-compliant).
 * Modeled after Endpoint / auditbeat process events for use as event attachments.
 */
function generateProcessEvent(eventNum: number) {
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
  const pid = Math.floor(Math.random() * 65535) + 1;

  return {
    '@timestamp': now.toISOString(),
    agent: { id: uuidv4(), type: pick(['auditbeat', 'endpoint']), version: '9.1.0', hostname },
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
      ppid: Math.floor(Math.random() * 65535) + 1,
      start: new Date(now.getTime() - Math.floor(Math.random() * 3600000)).toISOString(),
      args: proc.args,
    },
    user: { name: username },
    message: `Process ${proc.name} (PID: ${pid}) by ${username} ${eventAction.toUpperCase()}`,
    data_stream: { type: 'logs', dataset: 'endpoint.events.process', namespace: 'default' },
  };
}

// ─── Case & Comment Builders ───────────────────────────────────────────────────

/** Builds a CasePostRequest object for the Cases API. */
function buildCaseRequest(counter: number, owner: string, reqId: string): CasePostRequest {
  return {
    title: `Sample Case: ${reqId} - ${counter}`,
    tags: [],
    severity: CaseSeverity.LOW,
    description: `Auto generated case ${counter}`,
    assignees: [],
    connector: {
      id: 'none',
      name: 'none',
      // @ts-ignore
      type: '.none',
      fields: null,
    },
    settings: { syncAlerts: false, extractObservables: false },
    owner: owner ?? 'cases',
    customFields: [],
  };
}

/** Builds a user comment attachment body for the Cases comment API. */
function buildUserComment(owner: string, index: number) {
  return { type: 'user' as const, comment: `Auto generated comment ${index + 1}`, owner };
}

// ─── ES Bulk Indexing ──────────────────────────────────────────────────────────

/**
 * Bulk-indexes alert documents into Elasticsearch.
 * Alerts are indexed with explicit _id so they can be referenced as case attachments.
 */
async function bulkIndexAlerts(
  esClient: Client,
  alertIndex: string,
  count: number,
  owner: string
): Promise<AlertInfo[]> {
  const generator = owner === 'observability' ? generateObservabilityAlert : generateSecurityAlert;
  const alerts = Array.from({ length: count }, (_, i) => generator(i));

  const CHUNK = 500;
  for (let start = 0; start < alerts.length; start += CHUNK) {
    const chunk = alerts.slice(start, start + CHUNK);
    const operations = chunk.flatMap((a) => [
      { index: { _index: alertIndex, _id: a._id } },
      a._source,
    ]);
    const res = await esClient.bulk({
      operations,
      refresh: start + CHUNK >= alerts.length ? 'wait_for' : false,
    });
    if (res.errors) {
      logger.error(
        `Bulk index errors: ${JSON.stringify(res.items.filter((i) => i.index?.error).slice(0, 3))}`
      );
    }
    logger.info(`  [${alertIndex}] ${Math.min(start + CHUNK, alerts.length)}/${alerts.length}`);
  }

  return alerts.map((a) => ({
    alertId: a._id,
    index: alertIndex,
    ruleId: a.ruleId,
    ruleName: a.ruleName,
  }));
}

/**
 * Bulk-indexes process event documents into Elasticsearch.
 * Events use `create` operations because the events index is a data stream.
 * Returns EventInfo[] with ES-assigned document IDs.
 */
async function bulkIndexEvents(
  esClient: Client,
  eventIndex: string,
  count: number
): Promise<EventInfo[]> {
  const events = Array.from({ length: count }, (_, i) => generateProcessEvent(i));
  const allEventInfos: EventInfo[] = [];

  const CHUNK = 500;
  for (let start = 0; start < events.length; start += CHUNK) {
    const chunk = events.slice(start, start + CHUNK);
    const operations = chunk.flatMap((evt) => [{ create: { _index: eventIndex } }, evt]);
    const res = await esClient.bulk({
      operations,
      refresh: start + CHUNK >= events.length ? 'wait_for' : false,
    });
    if (res.errors) {
      logger.error(
        `Bulk index errors: ${JSON.stringify(res.items.filter((i) => i.create?.error).slice(0, 3))}`
      );
    }
    for (const item of res.items) {
      if (item.create?._id && !item.create.error) {
        allEventInfos.push({ eventId: item.create._id, index: eventIndex });
      }
    }
    logger.info(`  [${eventIndex}] ${Math.min(start + CHUNK, events.length)}/${events.length}`);
  }

  return allEventInfos;
}

/**
 * Indexes alerts into the correct owner-specific index for each owner that needs them.
 * Returns a Map of owner → AlertInfo[] so each case can pull from the right pool.
 */
async function indexAlertsForOwners(
  esClient: Client,
  cases: CasePostRequest[],
  alertsPerCase: number,
  space: string
): Promise<Map<string, AlertInfo[]>> {
  const alertsNeededByOwner = new Map<string, number>();
  for (const c of cases) {
    alertsNeededByOwner.set(c.owner, (alertsNeededByOwner.get(c.owner) ?? 0) + alertsPerCase);
  }

  const alertsByOwner = new Map<string, AlertInfo[]>();
  for (const [owner, count] of alertsNeededByOwner.entries()) {
    const alertIndex = getAlertsIndex(owner, space);
    logger.info(`Indexing ${count} alerts into ${alertIndex} for owner "${owner}"...`);
    alertsByOwner.set(owner, await bulkIndexAlerts(esClient, alertIndex, count, owner));
  }
  return alertsByOwner;
}

// ─── Attachment SO Builder ─────────────────────────────────────────────────────

/**
 * Builds a cases-attachments saved object for the Kibana SO bulk create API.
 * This creates the v2 unified attachment SOs alongside the v1 cases-comments SOs.
 */
function buildAttachmentSO(attachment: CreatedAttachment) {
  const now = new Date().toISOString();
  const id = uuidv4();

  const attributes: Record<string, unknown> = {
    type: attachment.type,
    attachmentId: id,
    created_at: now,
    created_by: { username: 'elastic' },
    pushed_at: null,
    updated_at: null,
  };

  if (attachment.type === 'user') {
    attributes.data = { content: attachment.comment };
  } else if (attachment.type === 'alert') {
    attributes.data = {
      alertId: attachment.alertId,
      index: attachment.index,
      rule: attachment.rule,
    };
    attributes.metadata = { actionType: 'alert' };
  } else if (attachment.type === 'event') {
    attributes.data = { eventId: attachment.eventId, index: attachment.index };
    attributes.metadata = { actionType: 'event' };
  }

  return {
    type: 'cases-attachments',
    id,
    attributes,
    references: [{ id: attachment.caseId, name: 'associated-cases', type: 'cases' }],
  };
}

/**
 * Bulk-creates cases-attachments saved objects via the Kibana SO API.
 * Processes attachments in chunks of 200 to avoid payload size limits.
 */
async function bulkCreateAttachmentSOs({
  kbnClient,
  headers,
  attachments,
  space,
}: {
  kbnClient: KbnClient;
  headers: Record<string, string>;
  attachments: CreatedAttachment[];
  space: string;
}) {
  if (attachments.length === 0) return;

  const basePath = space ? `/s/${space}` : '';
  const soPath = `${basePath}/api/saved_objects/_bulk_create`;
  const docs = attachments.map((a) => buildAttachmentSO(a));

  const CHUNK = 200;
  for (let start = 0; start < docs.length; start += CHUNK) {
    const chunk = docs.slice(start, start + CHUNK);
    try {
      await kbnClient.request({ method: 'POST', path: soPath, headers, body: chunk });
    } catch (err) {
      logger.error(`Error bulk-creating attachment SOs: ${(err as Error).message}`);
    }
    logger.info(`  [attachments SO] ${Math.min(start + CHUNK, docs.length)}/${docs.length}`);
  }
}

// ─── Template Creation ─────────────────────────────────────────────────────────

/**
 * Formats a KbnClient error for logging, including the response body if available.
 * KbnClientRequesterError stores HTTP status on axiosError.status (response is stripped),
 * and embeds full details in the message string.
 */
function formatRequestError(err: unknown): string {
  const error = err as Error & {
    axiosError?: { status?: number };
    response?: { data?: unknown; status?: number };
  };
  const parts = [error.message];
  // axiosError.status is preserved by KbnClientRequesterError even after response is stripped
  const status = error.axiosError?.status ?? error.response?.status;
  if (status && !error.message.includes(String(status))) {
    parts.push(`status=${status}`);
  }
  if (error.response?.data) {
    parts.push(`body=${JSON.stringify(error.response.data)}`);
  }
  return parts.join(' | ');
}

/**
 * Creates templates via the dedicated templates API.
 * Each template is POSTed individually to POST /internal/cases/templates.
 */
async function createTemplates({
  kbnClient,
  headers,
  space,
  owner,
  templates,
}: {
  kbnClient: KbnClient;
  headers: Record<string, string>;
  space: string;
  owner: string;
  templates: TemplateInput[];
}) {
  if (templates.length === 0) return;

  const basePath = space ? `/s/${space}` : '';
  const templatesPath = `${basePath}/internal/cases/templates`;
  const spaceLabel = space || 'default';

  logger.info(
    `Creating ${templates.length} template(s) for owner "${owner}" in space "${spaceLabel}"...`
  );

  for (const template of templates) {
    const definitionObj: Record<string, unknown> = {
      name: template.name,
      fields: [],
    };
    if (template.description) definitionObj.description = template.description;
    if (template.tags && template.tags.length > 0) definitionObj.tags = template.tags;

    const definition = yaml.dump(definitionObj);

    const body: Record<string, unknown> = { owner, definition };
    if (template.description) body.description = template.description;
    if (template.tags && template.tags.length > 0) body.tags = template.tags;

    try {
      await kbnClient.request({
        method: 'POST',
        path: templatesPath,
        headers,
        body,
      });
      logger.info(`  Created template "${template.name}" for owner "${owner}"`);
    } catch (err) {
      logger.error(
        `Failed to create template "${template.name}" for owner "${owner}": ${formatRequestError(
          err
        )}`
      );
    }
  }
}

// ─── Case Generation Orchestrator ──────────────────────────────────────────────

/**
 * Main orchestrator that creates cases with their attachments.
 * Cases are created via the Cases API, then attachments (comments, alerts, events)
 * are added sequentially per case to avoid version conflicts on the case SO.
 * After all API-created attachments, matching cases-attachments SOs are bulk-created.
 */
async function generateCases({
  cases,
  space,
  kbnClient,
  headers,
  commentsPerCase,
  alertsPerCase,
  eventsPerCase,
  alertsByOwner,
  events,
}: {
  cases: CasePostRequest[];
  space: string;
  kbnClient: KbnClient;
  headers: Record<string, string>;
  commentsPerCase: number;
  alertsPerCase: number;
  eventsPerCase: number;
  alertsByOwner: Map<string, AlertInfo[]>;
  events: EventInfo[];
}) {
  const basePath = space ? `/s/${space}` : '';
  const casesPath = `${basePath}/api/cases`;
  const totalAttachments = commentsPerCase + alertsPerCase + eventsPerCase;

  const spaceLabel = space ? `space: ${space}` : 'default space';
  const parts: string[] = [];
  if (commentsPerCase > 0) parts.push(`${commentsPerCase} comments`);
  if (alertsPerCase > 0) parts.push(`${alertsPerCase} alerts`);
  if (eventsPerCase > 0) parts.push(`${eventsPerCase} events`);
  logger.info(
    `Creating ${cases.length} cases in ${spaceLabel}${
      parts.length > 0 ? ` with ${parts.join(', ')} each` : ''
    }`
  );

  const concurrency = totalAttachments > 0 ? 10 : 100;
  const ownerCursors = new Map<string, number>();
  let eventCursor = 0;
  const createdAttachments: CreatedAttachment[] = [];

  await pMap(
    cases,
    async (newCase, index) => {
      if (index % concurrency === 0) {
        console.info(
          `CREATING CASES ${index + 1} to ${Math.min(index + concurrency, cases.length)}`
        );
      }

      try {
        const { data: created } = await kbnClient.request<{ id: string }>({
          method: 'POST',
          path: casesPath,
          headers,
          body: newCase,
        });

        const caseId = created.id;
        if (totalAttachments === 0) return;

        const commentPath = `${basePath}/api/cases/${caseId}/comments`;

        // Comments — sequential to avoid version conflicts
        for (let i = 0; i < commentsPerCase; i++) {
          try {
            await kbnClient.request({
              method: 'POST',
              path: commentPath,
              headers,
              body: buildUserComment(newCase.owner, i),
            });
            createdAttachments.push({
              caseId,
              owner: newCase.owner,
              type: 'user',
              comment: `Auto generated comment ${i + 1}`,
            });
          } catch (err) {
            logger.error(`Error adding comment to case ${caseId}: ${(err as Error).message}`);
          }
        }

        // Alerts — from the owner's pre-indexed pool
        const ownerAlerts = alertsByOwner.get(newCase.owner) ?? [];
        const cursor = ownerCursors.get(newCase.owner) ?? 0;
        for (let i = 0; i < alertsPerCase; i++) {
          const alert = ownerAlerts[(cursor + i) % ownerAlerts.length];
          try {
            await kbnClient.request({
              method: 'POST',
              path: commentPath,
              headers,
              body: {
                type: 'alert',
                alertId: alert.alertId,
                index: alert.index,
                rule: { id: alert.ruleId, name: alert.ruleName },
                owner: newCase.owner,
              },
            });
            createdAttachments.push({
              caseId,
              owner: newCase.owner,
              type: 'alert',
              alertId: alert.alertId,
              index: alert.index,
              rule: { id: alert.ruleId, name: alert.ruleName },
            });
          } catch (err) {
            logger.error(`Error adding alert to case ${caseId}: ${(err as Error).message}`);
          }
        }
        ownerCursors.set(newCase.owner, cursor + alertsPerCase);

        // Events — from the shared pre-indexed pool
        for (let i = 0; i < eventsPerCase; i++) {
          if (events.length === 0) break;
          const evt = events[(eventCursor + i) % events.length];
          try {
            await kbnClient.request({
              method: 'POST',
              path: commentPath,
              headers,
              body: { type: 'event', eventId: evt.eventId, index: evt.index, owner: newCase.owner },
            });
            createdAttachments.push({
              caseId,
              owner: newCase.owner,
              type: 'event',
              eventId: evt.eventId,
              index: evt.index,
            });
          } catch (err) {
            logger.error(`Error adding event to case ${caseId}: ${(err as Error).message}`);
          }
        }
        eventCursor += eventsPerCase;
      } catch (error) {
        logger.error(`Error creating case: ${newCase.title}`);
        logger.error(error);
      }
    },
    { concurrency }
  );

  // Bulk-create matching cases-attachments SOs
  if (createdAttachments.length > 0) {
    logger.info(`Creating ${createdAttachments.length} attachment SOs via saved objects API...`);
    await bulkCreateAttachmentSOs({ kbnClient, headers, attachments: createdAttachments, space });
  }
}

// ─── Interactive CLI ───────────────────────────────────────────────────────────

/**
 * Prompts the user for input via readline and returns their response.
 * Shows the default value in brackets if one is provided.
 */
function prompt(rl: readline.Interface, question: string, defaultVal?: string): Promise<string> {
  const suffix = defaultVal !== undefined ? ` [${defaultVal}]` : '';
  return new Promise((resolve) => {
    rl.question(`${question}${suffix}: `, (answer) => {
      resolve(answer.trim() || defaultVal || '');
    });
  });
}

/**
 * Collects template definitions, target owner(s), and target space from the user.
 * Extracted from interactiveMode to keep cyclomatic complexity within limits.
 */
async function collectTemplateInputs(
  rl: readline.Interface,
  owners: string[],
  space: string
): Promise<{ templates: TemplateInput[]; templateOwners: string[]; templateSpace: string }> {
  console.log('\n── Step 4: Templates (optional) ──\n');
  const createTemplatesStr = await prompt(rl, 'Create templates? (y/n)', 'n');
  const templates: TemplateInput[] = [];
  let templateOwners: string[] = [];
  let templateSpace = space;

  if (createTemplatesStr.toLowerCase() !== 'y') {
    return { templates, templateOwners, templateSpace };
  }

  // Ask which solution (owner) and space to create templates in
  const templateOwnersStr = await prompt(
    rl,
    'Which solution(s) should templates be created for? (comma-separated: securitySolution, observability, cases)',
    owners.join(',')
  );
  templateOwners = templateOwnersStr
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  templateSpace = await prompt(
    rl,
    'Which space should templates be created in?',
    space || 'default'
  );
  // Normalize: empty string means default space (no space prefix in URL)
  if (templateSpace === 'default') {
    templateSpace = '';
  }

  let addMore = true;
  let templateNum = 1;

  while (addMore && templates.length < 10) {
    console.log(`\n  Template ${templateNum}:`);
    const name = await prompt(rl, '  Template name', `Template ${templateNum}`);
    const description = await prompt(rl, '  Description (optional)', '');
    const tagsStr = await prompt(rl, '  Tags (comma-separated, optional)', '');
    const tags = tagsStr
      ? tagsStr
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    templates.push({
      name,
      ...(description ? { description } : {}),
      ...(tags.length > 0 ? { tags } : {}),
    });

    templateNum++;
    if (templates.length < 10) {
      const moreStr = await prompt(rl, '  Add another template? (y/n)', 'n');
      addMore = moreStr.toLowerCase() === 'y';
    }
  }

  return { templates, templateOwners, templateSpace };
}

/**
 * Runs an interactive step-by-step CLI wizard that guides users through
 * configuring the case generator. Each step has sensible defaults.
 */
async function interactiveMode(): Promise<GeneratorConfig> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log('\n╔══════════════════════════════════════╗');
  console.log('║    Cases Generator - Interactive CLI  ║');
  console.log('╚══════════════════════════════════════╝\n');

  // Step 1: Connection settings
  console.log('── Step 1: Connection Settings ──\n');
  const kibana = await prompt(rl, 'Kibana URL', 'http://127.0.0.1:5601');
  const node = await prompt(rl, 'Elasticsearch URL', 'http://elastic:changeme@127.0.0.1:9200');
  const username = await prompt(rl, 'Username', 'elastic');
  const password = await prompt(rl, 'Password', 'changeme');
  const sslStr = await prompt(rl, 'Use SSL? (y/n)', 'n');
  const ssl = sslStr.toLowerCase() === 'y';
  const apiKey = await prompt(rl, 'API Key (leave empty for basic auth)', '');

  // Step 2: Space and owners
  console.log('\n── Step 2: Space & Owners ──\n');
  const space = await prompt(rl, 'Space ID (empty for default)', '');
  const ownersStr = await prompt(
    rl,
    'Owners (comma-separated: securitySolution, observability, cases)',
    'securitySolution,observability,cases'
  );
  const owners = ownersStr
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  // Step 3: Case generation
  console.log('\n── Step 3: Case Generation ──\n');
  const countStr = await prompt(rl, 'Number of cases to generate', '10');
  const count = parseInt(countStr, 10) || 10;
  const commentsStr = await prompt(rl, 'User comments per case', '0');
  const comments = parseInt(commentsStr, 10) || 0;
  const alertsStr = await prompt(rl, 'Alert attachments per case', '0');
  const alerts = parseInt(alertsStr, 10) || 0;
  const eventsStr = await prompt(rl, 'Event attachments per case', '0');
  const events = parseInt(eventsStr, 10) || 0;

  // Step 4: Templates
  const { templates, templateOwners, templateSpace } = await collectTemplateInputs(
    rl,
    owners,
    space
  );

  rl.close();

  // Summary
  console.log('\n── Summary ──\n');
  console.log(`  Kibana:     ${kibana}`);
  console.log(`  ES:         ${node}`);
  console.log(`  Space:      ${space || 'default'}`);
  console.log(`  Owners:     ${owners.join(', ')}`);
  console.log(`  Cases:      ${count}`);
  if (comments > 0) console.log(`  Comments:   ${comments} per case`);
  if (alerts > 0) console.log(`  Alerts:     ${alerts} per case`);
  if (events > 0) console.log(`  Events:     ${events} per case`);
  if (templates.length > 0) {
    console.log(`  Templates:  ${templates.length}`);
    console.log(`    Owners:   ${templateOwners.join(', ')}`);
    console.log(`    Space:    ${templateSpace || 'default'}`);
  }
  console.log('');

  return {
    kibana,
    node,
    username,
    password,
    ssl,
    apiKey,
    space,
    owners,
    count,
    comments,
    alerts,
    events,
    templates,
    templateOwners,
    templateSpace,
  };
}

/** Logs the final summary after all work is done. */
function logFinalSummary(config: GeneratorConfig) {
  logger.info('Done!');
  const summaryParts: string[] = [];
  if (config.comments > 0) summaryParts.push(`${config.comments} comments`);
  if (config.alerts > 0) summaryParts.push(`${config.alerts} alerts`);
  if (config.events > 0) summaryParts.push(`${config.events} events`);
  if (summaryParts.length > 0) {
    logger.info(`Created ${config.count} cases, each with ${summaryParts.join(', ')}`);
  }
  if (config.templates.length > 0) {
    const tplSpaceLabel = config.templateSpace || 'default';
    const tplOwnersList = config.templateOwners.join(', ');
    logger.info(
      `Created ${config.templates.length} template(s) in space "${tplSpaceLabel}" for owner(s): ${tplOwnersList}`
    );
  }
}

// ─── Main Entry Point ──────────────────────────────────────────────────────────

async function main() {
  try {
    const argv = yargs.help().options({
      interactive: {
        alias: 'i',
        describe: 'Run in interactive mode with step-by-step prompts',
        type: 'boolean',
        default: false,
      },
      username: {
        alias: 'u',
        describe: 'Username for Kibana/ES authentication',
        type: 'string',
        default: 'elastic',
      },
      password: {
        alias: 'p',
        describe: 'Password for Kibana/ES authentication',
        type: 'string',
        default: 'changeme',
      },
      kibana: {
        alias: 'k',
        describe: 'Kibana URL',
        default: 'http://127.0.0.1:5601',
        type: 'string',
      },
      node: {
        alias: 'n',
        describe: 'Elasticsearch node URL',
        default: 'http://elastic:changeme@127.0.0.1:9200',
        type: 'string',
      },
      count: {
        alias: 'c',
        describe: 'Number of cases to generate',
        type: 'number',
        default: 10,
      },
      comments: {
        alias: 'm',
        describe: 'Number of user comments per case',
        type: 'number',
        default: 0,
      },
      alerts: {
        alias: 'a',
        describe: 'Number of alert attachments per case (indexed into ES)',
        type: 'number',
        default: 0,
      },
      events: {
        alias: 'e',
        describe: 'Number of event attachments per case (process events)',
        type: 'number',
        default: 0,
      },
      apiKey: {
        describe: 'API key for authorization (required for serverless)',
        type: 'string',
        default: '',
      },
      owners: {
        alias: 'o',
        describe: 'Case owners (securitySolution, observability, cases)',
        default: ['securitySolution', 'observability', 'cases'],
        type: 'array',
      },
      space: {
        alias: 's',
        describe: 'Kibana space ID',
        default: '',
        type: 'string',
      },
      ssl: {
        describe: 'Use HTTPS with certificate verification',
        type: 'boolean',
        default: false,
      },
      templates: {
        alias: 't',
        describe: 'Number of auto-generated templates to create per owner (max 10)',
        type: 'number',
        default: 0,
      },
      templateOwners: {
        describe: 'Owner(s) to create templates for (defaults to --owners)',
        type: 'array',
      },
      templateSpace: {
        describe: 'Space to create templates in (defaults to --space)',
        type: 'string',
      },
    }).argv;

    // Determine configuration — interactive mode or CLI args
    let config: GeneratorConfig;

    if (argv.interactive) {
      config = await interactiveMode();
    } else {
      // Build auto-generated templates if --templates flag is used
      const templateCount = Math.min(Number(argv.templates) || 0, 10);
      const autoTemplates: TemplateInput[] = Array.from({ length: templateCount }, (_, i) => ({
        name: `Auto Template ${i + 1}`,
        description: `Auto-generated template ${i + 1}`,
        tags: ['auto-generated'],
      }));

      const cliOwners = argv.owners as string[];

      config = {
        kibana: argv.kibana,
        node: argv.node,
        username: argv.username,
        password: argv.password,
        ssl: argv.ssl,
        apiKey: argv.apiKey ?? '',
        space: argv.space,
        owners: cliOwners,
        count: Number(argv.count),
        comments: Number(argv.comments),
        alerts: Number(argv.alerts),
        events: Number(argv.events ?? 0),
        templates: autoTemplates,
        templateOwners: (argv.templateOwners as string[] | undefined) ?? cliOwners,
        templateSpace: argv.templateSpace ?? argv.space,
      };
    }

    // Validate owners
    const invalidOwner = [...config.owners, ...config.templateOwners].find(
      (o) => !VALID_OWNERS.includes(o as (typeof VALID_OWNERS)[number])
    );
    if (invalidOwner) {
      logger.error(`Invalid owner: "${invalidOwner}". Valid owners: ${VALID_OWNERS.join(', ')}`);
      // eslint-disable-next-line no-process-exit
      process.exit(1);
    }

    // Create clients
    const { kbnClient, headers } = createKbnClient({
      url: config.kibana,
      username: config.username,
      password: config.password,
      ssl: config.ssl,
      apiKey: config.apiKey,
    });

    // Create templates if requested (per owner)
    if (config.templates.length > 0 && config.templateOwners.length > 0) {
      const tplSpace = config.templateSpace || 'default';
      logger.info(
        `Creating ${
          config.templates.length
        } template(s) in space "${tplSpace}" for owners: ${config.templateOwners.join(', ')}`
      );
      for (const owner of config.templateOwners) {
        await createTemplates({
          kbnClient,
          headers,
          space: config.templateSpace,
          owner,
          templates: config.templates,
        });
      }
      logger.info('Template creation complete.');
    }

    // Build case objects
    const reqId = randomString(6);
    const cases = Array.from({ length: config.count }, (_, i) => {
      const owner = config.owners[Math.floor(Math.random() * config.owners.length)];
      return buildCaseRequest(i + 1, owner, reqId);
    });

    // Index alerts and events into ES if needed
    let alertsByOwner = new Map<string, AlertInfo[]>();
    let indexedEvents: EventInfo[] = [];

    if (config.alerts > 0 || config.events > 0) {
      const esClient = createEsClient({
        node: config.node,
        ssl: config.ssl,
        username: config.username,
        password: config.password,
      });

      if (config.alerts > 0) {
        alertsByOwner = await indexAlertsForOwners(esClient, cases, config.alerts, config.space);
      }
      if (config.events > 0) {
        const totalEvents = config.count * config.events;
        const eventIndex = getEventsIndex(config.space);
        logger.info(`Indexing ${totalEvents} events into ${eventIndex}...`);
        indexedEvents = await bulkIndexEvents(esClient, eventIndex, totalEvents);
      }
    }

    // Generate cases with attachments
    await generateCases({
      cases,
      space: config.space,
      kbnClient,
      headers,
      commentsPerCase: config.comments,
      alertsPerCase: config.alerts,
      eventsPerCase: config.events,
      alertsByOwner,
      events: indexedEvents,
    });

    logFinalSummary(config);
  } catch (error) {
    console.log(error);
  }
}

main();

process.on('uncaughtException', (err) => {
  console.log(err);
});
