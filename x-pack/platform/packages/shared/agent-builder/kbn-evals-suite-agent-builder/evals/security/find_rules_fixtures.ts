/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { KbnClient } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';

const DETECTION_RULES_URL = '/api/detection_engine/rules';
const DETECTION_RULES_BULK_ACTION_URL = '/api/detection_engine/rules/_bulk_action';
const ALERTS_INDEX = '.internal.alerts-security.alerts-default-000001';

interface ThreatMapping {
  tacticId: string;
  tacticName: string;
  techniqueId: string;
  techniqueName: string;
}

interface SeededRule {
  name: string;
  description: string;
  tags: string[];
  type: 'query' | 'eql' | 'threshold' | 'threat_match' | 'esql';
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  indexPattern: string;
  threat?: ThreatMapping;
}

const ENDPOINT_INDEX = 'logs-endpoint.events.*';
const NETWORK_INDEX = 'filebeat-*';
const WINLOG_INDEX = 'winlogbeat-*';

export const SEEDED_RULES: SeededRule[] = [
  {
    name: 'Suspicious PowerShell Execution',
    description: 'Detects suspicious PowerShell process execution',
    tags: ['MITRE', 'Domain: Endpoint', 'OS: Windows', 'Tactic: Execution', 'Technique: T1059'],
    type: 'query',
    enabled: true,
    severity: 'critical',
    riskScore: 99,
    indexPattern: ENDPOINT_INDEX,
    threat: {
      tacticId: 'TA0002',
      tacticName: 'Execution',
      techniqueId: 'T1059',
      techniqueName: 'Command and Scripting Interpreter',
    },
  },
  {
    name: 'PowerShell Encoded Command',
    description: 'Detects PowerShell -enc encoded command usage',
    tags: ['MITRE', 'Domain: Endpoint', 'OS: Windows', 'Tactic: Execution', 'Technique: T1059'],
    type: 'query',
    enabled: true,
    severity: 'high',
    riskScore: 73,
    indexPattern: ENDPOINT_INDEX,
    threat: {
      tacticId: 'TA0002',
      tacticName: 'Execution',
      techniqueId: 'T1059',
      techniqueName: 'Command and Scripting Interpreter',
    },
  },
  {
    name: 'Lateral Movement via SMB',
    description: 'Detects lateral movement via SMB connections',
    tags: ['MITRE', 'Domain: Network', 'Tactic: Lateral Movement', 'Technique: T1021'],
    type: 'eql',
    enabled: false,
    severity: 'high',
    riskScore: 70,
    indexPattern: WINLOG_INDEX,
    threat: {
      tacticId: 'TA0008',
      tacticName: 'Lateral Movement',
      techniqueId: 'T1021',
      techniqueName: 'Remote Services',
    },
  },
  {
    name: 'Credential Access via LSASS',
    description: 'Detects credential access attempts targeting LSASS',
    tags: [
      'MITRE',
      'Domain: Endpoint',
      'OS: Windows',
      'Tactic: Credential Access',
      'Technique: T1003',
    ],
    type: 'query',
    enabled: true,
    severity: 'critical',
    riskScore: 95,
    indexPattern: ENDPOINT_INDEX,
    threat: {
      tacticId: 'TA0006',
      tacticName: 'Credential Access',
      techniqueId: 'T1003',
      techniqueName: 'OS Credential Dumping',
    },
  },
  {
    name: 'Brute Force Detection',
    description: 'Detects brute force authentication attempts',
    tags: ['Network', 'Authentication'],
    type: 'threshold',
    enabled: true,
    severity: 'medium',
    riskScore: 47,
    indexPattern: NETWORK_INDEX,
  },
  {
    name: 'Anomalous DNS Activity',
    description: 'Detects anomalous DNS query patterns',
    tags: ['Network', 'DNS'],
    type: 'esql',
    enabled: true,
    severity: 'medium',
    riskScore: 47,
    indexPattern: NETWORK_INDEX,
  },
  {
    name: 'Custom DLL Loading Detection',
    description: 'Detects suspicious DLL loading by processes',
    tags: ['Custom', 'Domain: Endpoint', 'OS: Windows'],
    type: 'query',
    enabled: true,
    severity: 'high',
    riskScore: 70,
    indexPattern: ENDPOINT_INDEX,
  },
  {
    name: 'Phishing URL Indicators',
    description: 'Matches URLs against known phishing indicators',
    tags: ['MITRE', 'Domain: Network', 'Tactic: Initial Access', 'Technique: T1566'],
    type: 'threat_match',
    enabled: false,
    severity: 'low',
    riskScore: 25,
    indexPattern: NETWORK_INDEX,
    threat: {
      tacticId: 'TA0001',
      tacticName: 'Initial Access',
      techniqueId: 'T1566',
      techniqueName: 'Phishing',
    },
  },
  {
    name: 'Process Injection T1055',
    description: 'Detects process injection via SetWindowsHookEx',
    tags: [
      'MITRE',
      'Domain: Endpoint',
      'OS: Windows',
      'Tactic: Defense Evasion',
      'Technique: T1055',
    ],
    type: 'eql',
    enabled: true,
    severity: 'critical',
    riskScore: 95,
    indexPattern: ENDPOINT_INDEX,
    threat: {
      tacticId: 'TA0005',
      tacticName: 'Defense Evasion',
      techniqueId: 'T1055',
      techniqueName: 'Process Injection',
    },
  },
  {
    name: 'PowerShell Network Scan',
    description: 'Detects PowerShell-based network reconnaissance',
    tags: ['MITRE', 'Domain: Endpoint', 'OS: Windows', 'Tactic: Discovery', 'Technique: T1018'],
    type: 'query',
    enabled: true,
    severity: 'medium',
    riskScore: 47,
    indexPattern: ENDPOINT_INDEX,
    threat: {
      tacticId: 'TA0007',
      tacticName: 'Discovery',
      techniqueId: 'T1018',
      techniqueName: 'Remote System Discovery',
    },
  },
];

function buildThreat(t: ThreatMapping): Array<Record<string, unknown>> {
  return [
    {
      framework: 'MITRE ATT&CK',
      tactic: {
        id: t.tacticId,
        name: t.tacticName,
        reference: `https://attack.mitre.org/tactics/${t.tacticId}/`,
      },
      technique: [
        {
          id: t.techniqueId,
          name: t.techniqueName,
          reference: `https://attack.mitre.org/techniques/${t.techniqueId}/`,
        },
      ],
    },
  ];
}

function buildRuleBody(rule: SeededRule): Record<string, unknown> {
  const base = {
    name: rule.name,
    description: rule.description,
    tags: rule.tags,
    risk_score: rule.riskScore,
    severity: rule.severity,
    interval: '5m',
    from: 'now-6m',
    enabled: rule.enabled,
    author: [],
    false_positives: [],
    references: [],
    actions: [],
    throttle: 'no_actions',
    threat: rule.threat ? buildThreat(rule.threat) : [],
  };

  const index = [rule.indexPattern];

  switch (rule.type) {
    case 'query':
      return { ...base, type: 'query', language: 'kuery', query: 'process.name:*', index };
    case 'eql':
      return {
        ...base,
        type: 'eql',
        language: 'eql',
        query: 'process where event.type == "start"',
        index,
      };
    case 'threshold':
      return {
        ...base,
        type: 'threshold',
        language: 'kuery',
        query: 'event.action: "authentication_failure"',
        index,
        threshold: { field: ['source.ip'], value: 10 },
      };
    case 'threat_match':
      return {
        ...base,
        type: 'threat_match',
        language: 'kuery',
        query: '*:*',
        index,
        threat_index: ['logs-ti_*'],
        threat_query: '*:*',
        threat_mapping: [
          { entries: [{ field: 'url.full', type: 'mapping', value: 'threat.indicator.url.full' }] },
        ],
      };
    case 'esql':
      return { ...base, type: 'esql', language: 'esql', query: 'FROM logs-* | LIMIT 100' };
  }
}

export interface SeededFixtures {
  ruleIds: string[];
  ruleNames: string[];
  cleanup: () => Promise<void>;
}

export async function seedFindRulesFixtures({
  kbnClient,
  esClient,
  log,
}: {
  kbnClient: KbnClient;
  esClient: Client;
  log: ToolingLog;
}): Promise<SeededFixtures> {
  log.info(`[find-rules eval] Seeding ${SEEDED_RULES.length} detection rules...`);

  const ruleIds: string[] = [];
  const ruleNames: string[] = [];

  for (const rule of SEEDED_RULES) {
    try {
      const response = await kbnClient.request<{ id: string; name: string }>({
        path: DETECTION_RULES_URL,
        method: 'POST',
        body: buildRuleBody(rule),
      });
      ruleIds.push(response.data.id);
      ruleNames.push(response.data.name);
    } catch (err) {
      log.error(`[find-rules eval] Failed to create rule "${rule.name}": ${err.message}`);
      throw err;
    }
  }

  log.info(`[find-rules eval] Created ${ruleIds.length} rules`);

  // Inject synthetic alerts: 30 attributed to rule #0 (Suspicious PowerShell), 20 to rule #4 (Brute Force).
  // These two become the unambiguous "noisiest rules" for tests on alert volume.
  const noisyRule0 = { id: ruleIds[0], name: ruleNames[0] };
  const noisyRule4 = { id: ruleIds[4], name: ruleNames[4] };

  const alerts: Array<Record<string, unknown>> = [];
  for (let i = 0; i < 30; i++) {
    alerts.push(buildAlertDoc(noisyRule0, i));
  }
  for (let i = 0; i < 20; i++) {
    alerts.push(buildAlertDoc(noisyRule4, i));
  }

  await esClient.bulk({
    index: ALERTS_INDEX,
    refresh: 'wait_for',
    operations: alerts.flatMap((doc) => [{ create: {} }, doc]),
  });

  log.info(`[find-rules eval] Indexed ${alerts.length} synthetic alerts (30 + 20)`);

  const cleanup = async () => {
    log.info('[find-rules eval] Cleaning up seeded rules and alerts (scoped)...');

    if (ruleIds.length > 0) {
      try {
        await kbnClient.request({
          path: DETECTION_RULES_BULK_ACTION_URL,
          method: 'POST',
          body: { action: 'delete', ids: ruleIds },
        });
      } catch (err) {
        log.warning(`[find-rules eval] Rule scoped delete failed: ${err.message}`);
      }
    }

    try {
      await esClient.deleteByQuery({
        index: ALERTS_INDEX,
        query: { terms: { 'kibana.alert.rule.uuid': ruleIds } },
        refresh: true,
        conflicts: 'proceed',
      });
    } catch (err) {
      log.warning(`[find-rules eval] Alert scoped delete failed: ${err.message}`);
    }

    log.info('[find-rules eval] Cleanup complete');
  };

  return { ruleIds, ruleNames, cleanup };
}

function buildAlertDoc(rule: { id: string; name: string }, seq: number): Record<string, unknown> {
  const timestamp = new Date(Date.now() - seq * 60_000).toISOString();
  return {
    '@timestamp': timestamp,
    // `kibana.alert.rule.uuid` is the alerting Saved Object UUID. The noisy-rules flow
    // aggregates alerts by this field, then translates UUIDs back into rule names via
    // `find_rules` with `{ ruleId: "<uuid>" }`. The same UUID identifies the rule in the
    // event log (`kibana.saved_objects.id`), so this is the single identifier to use
    // across alerts/rules/event-log lookups.
    'kibana.alert.rule.uuid': rule.id,
    'kibana.alert.rule.name': rule.name,
    'kibana.alert.rule.consumer': 'siem',
    'kibana.alert.rule.producer': 'siem',
    'kibana.alert.severity': 'medium',
    'kibana.alert.risk_score': 47,
    'kibana.alert.status': 'active',
    'kibana.alert.workflow_status': 'open',
    'kibana.space_ids': ['default'],
    'event.kind': 'signal',
    'event.action': 'rule-execution',
  };
}
