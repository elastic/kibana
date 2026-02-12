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
 * - securitySolution → .internal.alerts-security.alerts-{space}
 * - observability    → .internal.alerts-observability.alerts-{space}
 * - cases            → .internal.alerts-security.alerts-{space} (fallback)
 */
const getAlertsIndex = (owner: string, space: string): string => {
  const spaceId = space || 'default';
  if (owner === 'observability') {
    return `.internal.alerts-observability.alerts-${spaceId}`;
  }
  // securitySolution and cases both use the security alerts index
  return `.internal.alerts-security.alerts-${spaceId}`;
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

const createEsClient = ({ node, ssl }: { node: string; ssl: boolean }): Client => {
  let clientOptions: ClientOptions = {
    Connection: HttpConnection,
    node,
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

/**
 * Generates a realistic alert document for indexing into Elasticsearch.
 */
const generateAlertDocument = (alertNum: number) => {
  const now = new Date();
  const alertId = uuidv4();
  const ruleId = uuidv4();
  const severities = ['low', 'medium', 'high', 'critical'];
  const hostnames = ['host-alpha', 'host-beta', 'host-gamma', 'host-delta'];
  const usernames = ['admin', 'root', 'operator', 'analyst'];
  const processNames = ['malware.exe', 'suspicious.sh', 'backdoor.py', 'crypto_miner'];
  const categories = ['malware', 'process', 'network', 'file'];
  const actions = [
    'rule_detection',
    'malicious_file',
    'process_injection',
    'suspicious_network_connection',
  ];

  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  const severity = pick(severities);
  const hostname = pick(hostnames);
  const username = pick(usernames);
  const processName = pick(processNames);
  const riskScore = Math.floor(Math.random() * 100);

  // Use dot-notation for all ECS fields to conform to the existing index mappings
  // managed by Kibana's alerting framework. Nested objects can create text mappings
  // that conflict with the expected keyword mappings.
  return {
    _id: alertId,
    ruleId,
    ruleName: `Generated Rule ${alertNum + 1}`,
    _source: {
      '@timestamp': now.toISOString(),
      'event.kind': 'signal',
      'event.category': pick(categories),
      'event.action': pick(actions),
      'event.dataset': 'endpoint',
      'event.module': 'endpoint',
      'host.name': hostname,
      'host.ip': `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      'host.os.name': 'Linux',
      'host.os.version': '5.15.0',
      'user.name': username,
      'process.name': processName,
      'process.pid': Math.floor(Math.random() * 65535),
      'process.executable': `/usr/bin/${processName}`,
      'file.name': processName,
      'file.path': `/tmp/${processName}`,
      'file.hash.sha256': uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, ''),
      'rule.id': ruleId,
      'rule.name': `Generated Rule ${alertNum + 1}`,
      'rule.description': `Auto-generated detection rule #${alertNum + 1}`,
      'kibana.alert.uuid': alertId,
      'kibana.alert.rule.rule_id': ruleId,
      'kibana.alert.rule.name': `Generated Rule ${alertNum + 1}`,
      'kibana.alert.rule.description': `Auto-generated detection rule #${alertNum + 1}`,
      'kibana.alert.rule.category': 'Custom Query Rule',
      'kibana.alert.rule.consumer': 'siem',
      'kibana.alert.rule.rule_type_id': 'siem.queryRule',
      'kibana.alert.severity': severity,
      'kibana.alert.risk_score': riskScore,
      'kibana.alert.workflow_status': 'open',
      'kibana.alert.reason': `${processName} detected on ${hostname} by user ${username}`,
      'kibana.alert.original_time': new Date(
        now.getTime() - Math.floor(Math.random() * 3600000)
      ).toISOString(),
      'kibana.alert.start': now.toISOString(),
    },
  };
};

/**
 * Bulk-indexes alert documents into the given ES index.
 * The index must already exist (created by Kibana's alerting framework).
 * Returns AlertInfo[] for each indexed alert.
 */
const bulkIndexAlerts = async (
  esClient: Client,
  alertIndex: string,
  count: number
): Promise<AlertInfo[]> => {
  const alerts = Array.from({ length: count }, (_, i) => generateAlertDocument(i));

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
    const alerts = await bulkIndexAlerts(esClient, alertIndex, count);
    alertsByOwner.set(owner, alerts);
  }

  return alertsByOwner;
};

const generateCases = async ({
  cases,
  space,
  kbnClient,
  headers,
  commentsPerCase,
  alertsPerCase,
  alertsByOwner,
}: {
  cases: CasePostRequest[];
  space: string;
  kbnClient: KbnClient;
  headers: Record<string, string>;
  commentsPerCase: number;
  alertsPerCase: number;
  alertsByOwner: Map<string, AlertInfo[]>;
}) => {
  try {
    const basePath = space ? `/s/${space}` : '';
    const casesPath = `${basePath}/api/cases`;
    const totalAttachments = commentsPerCase + alertsPerCase;

    const spaceLabel = space ? `space: ${space}` : 'default space';
    const attachmentLabel =
      totalAttachments > 0
        ? ` with ${commentsPerCase} comments and ${alertsPerCase} alerts each`
        : '';
    toolingLogger.info(`Creating ${cases.length} cases in ${spaceLabel}${attachmentLabel}`);

    const concurrency = totalAttachments > 0 ? 10 : 100;
    // Track a cursor per owner so each case gets unique alerts
    const ownerCursors = new Map<string, number>();

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
              } catch (err) {
                toolingLogger.error(
                  `Error adding alert to case ${caseId}: ${(err as Error).message}`
                );
              }
            }

            ownerCursors.set(newCase.owner, cursor + alertsPerCase);
          }
        } catch (error) {
          toolingLogger.error(`Error creating case: ${newCase.title}`);
          toolingLogger.error(error);
        }
      },
      { concurrency }
    );
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
    } = argv;
    const numCasesToCreate = Number(count);
    const commentsPerCase = Number(comments);
    const alertsPerCase = Number(alerts);
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

    if (alertsPerCase > 0) {
      const esClient = createEsClient({ node, ssl });
      alertsByOwner = await indexAlertsForOwners(esClient, cases, alertsPerCase, space);
    }

    await generateCases({
      cases,
      space,
      kbnClient,
      headers,
      commentsPerCase,
      alertsPerCase,
      alertsByOwner,
    });

    toolingLogger.info('Done!');
    if (commentsPerCase > 0 || alertsPerCase > 0) {
      toolingLogger.info(
        `Created ${numCasesToCreate} cases, each with ${commentsPerCase} comments and ${alertsPerCase} alerts (embedded on case SO)`
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
