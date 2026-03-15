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
import pMap from 'p-map';
import yargs from 'yargs';
import { CaseSeverity, type CasePostRequest } from '../common';

/**
 * Returns the real alerts index for a given owner and space.
 * - securitySolution → .alerts-security.alerts-{space}
 * - observability    → .alerts-observability.metrics.alerts-{space}
 * - cases            → .alerts-security.alerts-{space} (fallback)
 */
const getAlertsIndex = (owner: string, space: string): string => {
  const spaceId = space || 'default';
  if (owner === 'observability') {
    return `.alerts-observability.metrics.alerts-${spaceId}`;
  }
  // securitySolution and cases both use the security alerts index
  return `.alerts-security.alerts-${spaceId}`;
};

/**
 * Returns the events index for a given space.
 * Events are indexed into the Endpoint process events data stream.
 */
const getEventsIndex = (space: string): string => {
  const spaceId = space || 'default';
  return `logs-endpoint.events.process-${spaceId}`;
};

const toolingLogger = new ToolingLog({
  level: 'info',
  writeTo: process.stdout,
});

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

const createKbnClient = ({
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
}): { kbnClient: KbnClient; headers: Record<string, string> } => {
  const toolingLogOptions = { log: toolingLogger };

  let updatedUrl = updateURL({
    url,
    user: { username, password },
  });

  let kbnClientOptions: KbnClientOptions = {
    ...toolingLogOptions,
    url: updatedUrl,
  };

  if (ssl) {
    const ca = fs.readFileSync(CA_CERT_PATH);
    updatedUrl = updateURL({
      url: updatedUrl,
      user: { username, password },
      protocol: 'https:',
    });
    kbnClientOptions = {
      ...kbnClientOptions,
      certificateAuthorities: [ca],
      url: updatedUrl,
    };
  }

  const kbnClient = new KbnClient(kbnClientOptions);
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers.Authorization = `ApiKey ${apiKey}`;
  }

  return { kbnClient, headers };
};

const createEsClient = ({
  node,
  ssl,
  username,
  password,
}: {
  node: string;
  ssl: boolean;
  username: string;
  password: string;
}): Client => {
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
};

const createCase = (counter: number, owner: string, reqId: string): CasePostRequest => ({
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
  settings: {
    syncAlerts: false,
    extractObservables: false,
  },
  owner: owner ?? 'cases',
  customFields: [],
});

const createUserComment = (owner: string, index: number) => ({
  type: 'user' as const,
  comment: `Auto generated comment ${index + 1}`,
  owner,
});

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

/**
 * Generates a realistic security alert document for indexing into Elasticsearch.
 */
const generateSecurityAlertDocument = (alertNum: number) => {
  const now = new Date();
  const alertId = uuidv4();
  const ruleId = uuidv4();
  const severities = ['low', 'medium', 'high', 'critical'];
  const hostnames = ['host-alpha', 'host-beta', 'host-gamma', 'host-delta'];
  const usernames = ['admin', 'root', 'operator', 'analyst'];
  const processNames = ['malware.exe', 'suspicious.sh', 'backdoor.py', 'crypto_miner'];

  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  const severity = pick(severities);
  const hostname = pick(hostnames);
  const username = pick(usernames);
  const processName = pick(processNames);
  const riskScore = Math.floor(Math.random() * 100);

  // Only use kibana.alert.* fields that are guaranteed to be in the alerting
  // framework's managed index mappings. Avoid ECS fields (host.name, user.name, etc.)
  // that may not be mapped — ES dynamic mapping would create them as text fields,
  // breaking the UI when it tries to aggregate/sort on them.
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
      'kibana.alert.risk_score': riskScore,
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
};

/**
 * Generates a realistic observability alert document for indexing into Elasticsearch.
 * Modeled after metric threshold / inventory threshold / log threshold alerts
 * using fields from the observability alerting framework's managed index mappings.
 */
const generateObservabilityAlertDocument = (alertNum: number) => {
  const now = new Date();
  const alertId = uuidv4();
  const ruleId = uuidv4();
  const executionId = uuidv4();

  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

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
  const services = [
    'web-service',
    'api-gateway',
    'payment-service',
    'auth-service',
    'data-pipeline',
  ];
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
  const durationUs = Math.floor(Math.random() * 300000000); // up to 5 min

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
      'kibana.alert.rule.execution.uuid': executionId,
      'kibana.alert.action_group': ruleType.actionGroup,
      'kibana.alert.instance.id': isLogThreshold ? service : host,
      'kibana.alert.start': now.toISOString(),
      'kibana.alert.duration.us': durationUs,
      'kibana.alert.evaluation.value': parseFloat(metric.value),
      'kibana.alert.evaluation.threshold': parseFloat(metric.threshold),
      'event.kind': 'signal',
      'event.action': 'active',
      'kibana.space_ids': ['default'],
      'kibana.version': '9.1.0',
      'kibana.alert.flapping': false,
    },
  };
};

/**
 * Generates a realistic process event document for indexing into Elasticsearch.
 * Modeled after auditbeat / Endpoint process events with ECS-compliant fields.
 * These are raw source events (event.kind: 'event') rather than detection alerts.
 */
const generateEventDocument = (eventNum: number) => {
  const now = new Date();
  const eventId = uuidv4();
  const agentId = uuidv4();
  const hostId = uuidv4();
  const entityId = uuidv4();

  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  const hostnames = [
    'zeek-sensor-san-francisco',
    'zeek-sensor-amsterdam',
    'suricata-sensor-san-francisco',
    'es00.siem.estc.dev',
    'endpoint-host-alpha',
  ];
  const processInfos = [
    { name: 'sshd', executable: '/usr/sbin/sshd', args: ['sshd: [net]'] },
    { name: 'java', executable: '/usr/share/elasticsearch/jdk/bin/java', args: ['java', '-Xms4g'] },
    { name: 'kworker/u2:0', executable: '', args: [] },
    { name: 'cron', executable: '/usr/sbin/cron', args: ['/usr/sbin/cron', '-f'] },
    { name: 'nginx', executable: '/usr/sbin/nginx', args: ['nginx: worker process'] },
    { name: 'python3', executable: '/usr/bin/python3', args: ['python3', 'app.py'] },
    { name: 'node', executable: '/usr/bin/node', args: ['node', 'server.js'] },
    { name: 'bash', executable: '/bin/bash', args: ['/bin/bash', '-l'] },
  ];
  const usernames = ['root', 'sshd', 'www-data', 'elastic', 'nobody'];
  const agentTypes = ['auditbeat', 'endpoint', 'packetbeat'];
  const eventActions = ['process_started', 'process_stopped', 'exec', 'fork'];
  const eventTypes: string[][] = [['start'], ['end'], ['start'], ['info']];
  const osFamilies = [
    {
      name: 'Ubuntu',
      platform: 'ubuntu',
      family: 'debian',
      version: '22.04 LTS',
      kernel: '5.15.0-generic',
    },
    {
      name: 'macOS',
      platform: 'macOS',
      family: 'Darwin',
      version: '14.2.1',
      kernel: '23.2.0',
    },
    {
      name: 'CentOS',
      platform: 'centos',
      family: 'redhat',
      version: '8.5',
      kernel: '4.18.0-generic',
    },
  ];

  const hostname = pick(hostnames);
  const proc = pick(processInfos);
  const username = pick(usernames);
  const agentType = pick(agentTypes);
  const eventAction = pick(eventActions);
  const eventTypeIdx = eventActions.indexOf(eventAction);
  const eventType = eventTypes[eventTypeIdx >= 0 ? eventTypeIdx : 0];
  const osInfo = pick(osFamilies);
  const pid = Math.floor(Math.random() * 65535) + 1;
  const ppid = Math.floor(Math.random() * 65535) + 1;

  return {
    '@timestamp': now.toISOString(),
    agent: {
      id: agentId,
      type: agentType,
      version: '9.1.0',
      hostname,
    },
    ecs: { version: '1.4.0' },
    event: {
      action: eventAction,
      dataset: 'process',
      kind: 'event',
      module: agentType === 'endpoint' ? 'endpoint' : 'system',
      category: ['process'],
      type: eventType,
      id: eventId,
    },
    host: {
      architecture: 'x86_64',
      hostname,
      id: hostId,
      name: hostname,
      os: {
        name: osInfo.name,
        platform: osInfo.platform,
        family: osInfo.family,
        version: osInfo.version,
        kernel: osInfo.kernel,
      },
    },
    process: {
      entity_id: entityId,
      executable: proc.executable,
      name: proc.name,
      pid,
      ppid,
      start: new Date(now.getTime() - Math.floor(Math.random() * 3600000)).toISOString(),
      args: proc.args,
      working_directory: '/',
    },
    user: {
      name: username,
      id: username === 'root' ? '0' : String(Math.floor(Math.random() * 65534) + 1),
    },
    message: `Process ${proc.name} (PID: ${pid}) by user ${username} ${eventAction.toUpperCase()}`,
    data_stream: {
      type: 'logs',
      dataset: 'endpoint.events.process',
      namespace: 'default',
    },
  };
};

/**
 * Bulk-indexes event documents into the given ES index.
 * Uses `create` operations because the events index is a data stream
 * (data streams reject `index` ops and auto-generate _id).
 * Returns EventInfo[] with ES-assigned document IDs.
 */
const bulkIndexEvents = async (
  esClient: Client,
  eventIndex: string,
  count: number
): Promise<EventInfo[]> => {
  const events = Array.from({ length: count }, (_, i) => generateEventDocument(i));
  const allEventInfos: EventInfo[] = [];

  const CHUNK_SIZE = 500;
  for (let start = 0; start < events.length; start += CHUNK_SIZE) {
    const chunk = events.slice(start, start + CHUNK_SIZE);
    const operations = chunk.flatMap((evt) => [{ create: { _index: eventIndex } }, evt]);

    const bulkResponse = await esClient.bulk({
      operations,
      refresh: start + CHUNK_SIZE >= events.length ? 'wait_for' : false,
    });

    if (bulkResponse.errors) {
      const errorItems = bulkResponse.items.filter((item) => item.create?.error);
      toolingLogger.error(`Bulk index errors: ${JSON.stringify(errorItems.slice(0, 3))}`);
    }

    // Extract ES-assigned _id from each successful create response
    for (const item of bulkResponse.items) {
      if (item.create?._id && !item.create.error) {
        allEventInfos.push({ eventId: item.create._id, index: eventIndex });
      }
    }

    toolingLogger.info(
      `  [${eventIndex}] ${Math.min(start + CHUNK_SIZE, events.length)}/${events.length}`
    );
  }

  return allEventInfos;
};

/**
 * Indexes event documents for all cases that need them.
 * Events share a single pool across all owners since they go into
 * a common events index (logs-endpoint.events.process-{space}).
 */
const indexEventsForCases = async (
  esClient: Client,
  totalEvents: number,
  space: string
): Promise<EventInfo[]> => {
  const eventIndex = getEventsIndex(space);
  toolingLogger.info(`Indexing ${totalEvents} events into ${eventIndex}...`);
  return bulkIndexEvents(esClient, eventIndex, totalEvents);
};

/**
 * Bulk-indexes alert documents into the given ES index.
 * The index must already exist (created by Kibana's alerting framework).
 * Returns AlertInfo[] for each indexed alert.
 */
const bulkIndexAlerts = async (
  esClient: Client,
  alertIndex: string,
  count: number,
  owner: string
): Promise<AlertInfo[]> => {
  const generator =
    owner === 'observability' ? generateObservabilityAlertDocument : generateSecurityAlertDocument;
  const alerts = Array.from({ length: count }, (_, i) => generator(i));

  // Bulk index in chunks to avoid connection issues with large payloads
  const CHUNK_SIZE = 500;
  for (let start = 0; start < alerts.length; start += CHUNK_SIZE) {
    const chunk = alerts.slice(start, start + CHUNK_SIZE);
    const operations = chunk.flatMap((alert) => [
      { index: { _index: alertIndex, _id: alert._id } },
      alert._source,
    ]);

    const bulkResponse = await esClient.bulk({
      operations,
      refresh: start + CHUNK_SIZE >= alerts.length ? 'wait_for' : false,
    });

    if (bulkResponse.errors) {
      const errorItems = bulkResponse.items.filter((item) => item.index?.error);
      toolingLogger.error(`Bulk index errors: ${JSON.stringify(errorItems.slice(0, 3))}`);
    }

    toolingLogger.info(
      `  [${alertIndex}] ${Math.min(start + CHUNK_SIZE, alerts.length)}/${alerts.length}`
    );
  }

  return alerts.map((alert) => ({
    alertId: alert._id,
    index: alertIndex,
    ruleId: alert.ruleId,
    ruleName: alert.ruleName,
  }));
};

/**
 * Indexes alerts into the correct owner-specific index for each owner that needs them.
 * Returns a map of owner → AlertInfo[] so each case can pull from the right pool.
 */
const indexAlertsForOwners = async (
  esClient: Client,
  cases: CasePostRequest[],
  alertsPerCase: number,
  space: string
): Promise<Map<string, AlertInfo[]>> => {
  // Count how many alerts each owner needs
  const alertsNeededByOwner = new Map<string, number>();
  for (const c of cases) {
    const current = alertsNeededByOwner.get(c.owner) ?? 0;
    alertsNeededByOwner.set(c.owner, current + alertsPerCase);
  }

  const alertsByOwner = new Map<string, AlertInfo[]>();

  for (const [owner, count] of alertsNeededByOwner.entries()) {
    const alertIndex = getAlertsIndex(owner, space);
    toolingLogger.info(`Indexing ${count} alerts into ${alertIndex} for owner "${owner}"...`);
    const alerts = await bulkIndexAlerts(esClient, alertIndex, count, owner);
    alertsByOwner.set(owner, alerts);
  }

  return alertsByOwner;
};

/**
 * Builds a cases-attachments saved object for the Kibana SO bulk create API.
 */
const buildAttachmentSO = (attachment: CreatedAttachment) => {
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
    attributes.data = {
      eventId: attachment.eventId,
      index: attachment.index,
    };
    attributes.metadata = { actionType: 'event' };
  }

  return {
    type: 'cases-attachments',
    id,
    attributes,
    references: [
      {
        id: attachment.caseId,
        name: 'associated-cases',
        type: 'cases',
      },
    ],
  };
};

/**
 * Creates cases-attachments saved objects via the Kibana SO bulk create API.
 * This creates the v2 unified attachment SOs alongside the v1 cases-comments SOs
 * that are created via the Cases API.
 */
const bulkCreateAttachmentSOs = async ({
  kbnClient,
  headers,
  attachments,
  space,
}: {
  kbnClient: KbnClient;
  headers: Record<string, string>;
  attachments: CreatedAttachment[];
  space: string;
}) => {
  if (attachments.length === 0) return;

  const basePath = space ? `/s/${space}` : '';
  const soPath = `${basePath}/api/saved_objects/_bulk_create`;
  const docs = attachments.map((a) => buildAttachmentSO(a));

  const CHUNK_SIZE = 200;
  for (let start = 0; start < docs.length; start += CHUNK_SIZE) {
    const chunk = docs.slice(start, start + CHUNK_SIZE);

    try {
      await kbnClient.request({
        method: 'POST',
        path: soPath,
        headers,
        body: chunk,
      });
    } catch (err) {
      toolingLogger.error(`Error bulk-creating cases-attachments SOs: ${(err as Error).message}`);
    }

    toolingLogger.info(
      `  [cases-attachments] ${Math.min(start + CHUNK_SIZE, docs.length)}/${docs.length}`
    );
  }
};

const generateCases = async ({
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
}) => {
  try {
    const basePath = space ? `/s/${space}` : '';
    const casesPath = `${basePath}/api/cases`;
    const totalAttachments = commentsPerCase + alertsPerCase + eventsPerCase;

    const spaceLabel = space ? `space: ${space}` : 'default space';
    const parts: string[] = [];
    if (commentsPerCase > 0) parts.push(`${commentsPerCase} comments`);
    if (alertsPerCase > 0) parts.push(`${alertsPerCase} alerts`);
    if (eventsPerCase > 0) parts.push(`${eventsPerCase} events`);
    const attachmentLabel = parts.length > 0 ? ` with ${parts.join(', ')} each` : '';
    toolingLogger.info(`Creating ${cases.length} cases in ${spaceLabel}${attachmentLabel}`);

    const concurrency = totalAttachments > 0 ? 10 : 100;
    // Track a cursor per owner so each case gets unique alerts
    const ownerCursors = new Map<string, number>();
    // Track a global cursor for events (shared across all owners)
    let eventCursor = 0;
    // Collect attachment data for bulk-creating cases-attachments SOs
    const createdAttachments: CreatedAttachment[] = [];

    await pMap(
      cases,
      async (newCase, index) => {
        if (index % concurrency === 0) {
          const caseCount = cases.length;
          console.info(
            `CREATING CASES ${index + 1} to ${Math.min(index + concurrency, caseCount)}`
          );
        }

        try {
          const { data: createdCase } = await kbnClient.request<{ id: string }>({
            method: 'POST',
            path: casesPath,
            headers,
            body: newCase,
          });

          const caseId = createdCase.id;

          if (totalAttachments > 0) {
            const commentPath = `${basePath}/api/cases/${caseId}/comments`;

            // Attachments must be added sequentially because they are embedded
            // on the case SO — parallel writes cause version conflicts.

            // Add user comments
            for (let i = 0; i < commentsPerCase; i++) {
              try {
                await kbnClient.request({
                  method: 'POST',
                  path: commentPath,
                  headers,
                  body: createUserComment(newCase.owner, i),
                });
                // Track for cases-attachments SO creation
                createdAttachments.push({
                  caseId,
                  owner: newCase.owner,
                  type: 'user',
                  comment: `Auto generated comment ${i + 1}`,
                });
              } catch (err) {
                toolingLogger.error(
                  `Error adding comment to case ${caseId}: ${(err as Error).message}`
                );
              }
            }

            // Add real alert attachments from the owner's pool
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
                // Track for cases-attachments SO creation
                createdAttachments.push({
                  caseId,
                  owner: newCase.owner,
                  type: 'alert',
                  alertId: alert.alertId,
                  index: alert.index,
                  rule: { id: alert.ruleId, name: alert.ruleName },
                });
              } catch (err) {
                toolingLogger.error(
                  `Error adding alert to case ${caseId}: ${(err as Error).message}`
                );
              }
            }

            ownerCursors.set(newCase.owner, cursor + alertsPerCase);

            // Add event attachments from the shared events pool
            for (let i = 0; i < eventsPerCase; i++) {
              if (events.length === 0) break;
              const evt = events[(eventCursor + i) % events.length];

              try {
                await kbnClient.request({
                  method: 'POST',
                  path: commentPath,
                  headers,
                  body: {
                    type: 'event',
                    eventId: evt.eventId,
                    index: evt.index,
                    owner: newCase.owner,
                  },
                });
                createdAttachments.push({
                  caseId,
                  owner: newCase.owner,
                  type: 'event',
                  eventId: evt.eventId,
                  index: evt.index,
                });
              } catch (err) {
                toolingLogger.error(
                  `Error adding event to case ${caseId}: ${(err as Error).message}`
                );
              }
            }

            eventCursor += eventsPerCase;
          }
        } catch (error) {
          toolingLogger.error(`Error creating case: ${newCase.title}`);
          toolingLogger.error(error);
        }
      },
      { concurrency }
    );

    // Bulk-create matching cases-attachments SOs via the Kibana SO API
    if (createdAttachments.length > 0) {
      toolingLogger.info(
        `Creating ${createdAttachments.length} cases-attachments SOs via saved objects API...`
      );
      await bulkCreateAttachmentSOs({ kbnClient, headers, attachments: createdAttachments, space });
    }
  } catch (error) {
    toolingLogger.error(error);
  }
};

const main = async () => {
  try {
    const argv = yargs.help().options({
      username: {
        alias: 'u',
        describe: 'username for kibana',
        type: 'string',
        default: 'elastic',
      },
      password: {
        alias: 'p',
        describe: 'password for kibana',
        type: 'string',
        default: 'changeme',
      },
      kibana: {
        alias: 'k',
        describe: 'kibana url',
        default: 'http://127.0.0.1:5601',
        type: 'string',
      },
      node: {
        alias: 'n',
        describe: 'elasticsearch node url',
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
        describe: 'Number of real alert attachments per case (indexed into ES)',
        type: 'number',
        default: 0,
      },
      events: {
        alias: 'e',
        describe:
          'Number of event attachments per case (process events indexed into logs-endpoint.events.process-*)',
        type: 'number',
        default: 0,
      },
      apiKey: {
        alias: 'apiKey',
        describe: 'API key to pass as an authorization header. Necessary for serverless',
        type: 'string',
        default: '',
      },
      owners: {
        alias: 'o',
        describe:
          'solutions where the cases should be created. combination of securitySolution, observability, or cases',
        default: ['securitySolution', 'observability', 'cases'],
        type: 'array',
      },
      space: {
        alias: 's',
        describe: 'space where the cases should be created',
        default: '',
        type: 'string',
      },
      ssl: {
        alias: 'ssl',
        describe: 'Use https for non local environments',
        type: 'boolean',
        default: false,
      },
    }).argv;

    const {
      apiKey,
      username,
      password,
      kibana,
      node,
      count,
      owners,
      space,
      ssl,
      comments,
      alerts,
      events: eventsArg,
    } = argv;
    const numCasesToCreate = Number(count);
    const commentsPerCase = Number(comments);
    const alertsPerCase = Number(alerts);
    const eventsPerCase = Number(eventsArg);
    const potentialOwners = new Set(['securitySolution', 'observability', 'cases']);
    const invalidOwnerProvided = owners.some((owner) => !potentialOwners.has(owner));

    if (invalidOwnerProvided) {
      toolingLogger.error('Only valid owners are securitySolution, observability, and cases');
      // eslint-disable-next-line no-process-exit
      process.exit(1);
    }

    const idForThisRequest = getRandomString(6);

    const cases = Array(numCasesToCreate)
      .fill(null)
      .map((_, index) => {
        const owner = owners[Math.floor(Math.random() * owners.length)];
        return createCase(index + 1, owner, idForThisRequest);
      });

    const { kbnClient, headers } = createKbnClient({
      url: kibana,
      username,
      password,
      ssl,
      apiKey,
    });

    // If alerts are requested, index real alert documents into ES first
    let alertsByOwner = new Map<string, AlertInfo[]>();
    let indexedEvents: EventInfo[] = [];

    if (alertsPerCase > 0 || eventsPerCase > 0) {
      const esClient = createEsClient({ node, ssl, username, password });

      if (alertsPerCase > 0) {
        alertsByOwner = await indexAlertsForOwners(esClient, cases, alertsPerCase, space);
      }

      // If events are requested, index process event documents into ES
      if (eventsPerCase > 0) {
        const totalEvents = numCasesToCreate * eventsPerCase;
        indexedEvents = await indexEventsForCases(esClient, totalEvents, space);
      }
    }

    await generateCases({
      cases,
      space,
      kbnClient,
      headers,
      commentsPerCase,
      alertsPerCase,
      eventsPerCase,
      alertsByOwner,
      events: indexedEvents,
    });

    toolingLogger.info('Done!');
    if (commentsPerCase > 0 || alertsPerCase > 0 || eventsPerCase > 0) {
      const parts: string[] = [];
      if (commentsPerCase > 0) parts.push(`${commentsPerCase} comments`);
      if (alertsPerCase > 0) parts.push(`${alertsPerCase} alerts`);
      if (eventsPerCase > 0) parts.push(`${eventsPerCase} events`);
      toolingLogger.info(`Created ${numCasesToCreate} cases, each with ${parts.join(', ')}`);
      toolingLogger.info(
        'Attachments written to both cases-comments (via API) and cases-attachments (via SO API)'
      );
    }
  } catch (error) {
    console.log(error);
  }
};

const getRandomString = (length: number) =>
  Math.random()
    .toString(36)
    .substring(2, length + 2);

main();

process.on('uncaughtException', function (err) {
  console.log(err);
});
