/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';

/**
 * Fixtures for the `detection-coverage` evals.
 *
 * Deliberately separate from `find_rules_fixtures.ts`: these rules exist to trap specific
 * failure modes, so each one needs an exact `query` and `description`. The shared fixture
 * builder emits placeholder queries (`process.name:*`) and cannot express that, and
 * changing it would move the find-rules baselines.
 *
 * Each rule below encodes one judgement the skill must get right:
 *
 * - `POWERSHELL` — an enabled exact match. Its `-enc` behaviour lives only in the query,
 *   so a verdict of `covered_enabled` proves the judge saw the query, not just the name.
 * - `SMB` — an exact match that is **disabled**. The single most valuable verdict:
 *   `covered_disabled` means "you already own this, switch it on" instead of authoring
 *   a duplicate.
 * - `DNS_TUNNELING` — the behaviour appears **only in the description**, never the name.
 *   Traps a name-only search, which historically returned a false `no_coverage`.
 * - `OFFICE_CMD` — shares technique T1059 with `POWERSHELL` but detects a different
 *   behaviour on a different parent process. Traps "same technique means covered".
 * - `KUBECTL_STAGING` — scoped to the staging namespace only, so a production ask is a
 *   `no_coverage` with the close rule named, not a stretched `covered_enabled`.
 */

const ENDPOINT_INDEX = 'logs-endpoint.events.*';
const WINLOG_INDEX = 'winlogbeat-*';
const NETWORK_INDEX = 'logs-network_traffic.*';
const KUBERNETES_INDEX = 'logs-kubernetes.audit_logs-*';

const DETECTION_RULES_URL = '/api/detection_engine/rules';
const DETECTION_API_VERSION = '2023-10-31';

interface ThreatMapping {
  tacticId: string;
  tacticName: string;
  techniqueId: string;
  techniqueName: string;
}

interface CoverageFixtureRule {
  name: string;
  description: string;
  query: string;
  index: string;
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  tags: string[];
  threat: ThreatMapping;
}

export const COVERAGE_FIXTURE_RULES: CoverageFixtureRule[] = [
  {
    name: 'Suspicious PowerShell Execution',
    description: 'Detects suspicious PowerShell process execution on Windows endpoints',
    query: 'process.name:powershell.exe and process.args:*-enc*',
    index: ENDPOINT_INDEX,
    enabled: true,
    severity: 'critical',
    riskScore: 99,
    tags: ['MITRE', 'OS: Windows', 'Technique: T1059'],
    threat: {
      tacticId: 'TA0002',
      tacticName: 'Execution',
      techniqueId: 'T1059',
      techniqueName: 'Command and Scripting Interpreter',
    },
  },
  {
    name: 'Lateral Movement via SMB',
    description: 'Detects lateral movement via SMB connections between Windows hosts',
    query: 'event.code:5145 and network.protocol:smb',
    index: WINLOG_INDEX,
    enabled: false,
    severity: 'high',
    riskScore: 70,
    tags: ['MITRE', 'Domain: Network', 'Technique: T1021'],
    threat: {
      tacticId: 'TA0008',
      tacticName: 'Lateral Movement',
      techniqueId: 'T1021',
      techniqueName: 'Remote Services',
    },
  },
  {
    name: 'Anomalous Outbound Connection Burst',
    description:
      'Detects potential DNS tunneling via high-frequency TXT record queries from a single host',
    query: 'dns.question.type:TXT',
    index: NETWORK_INDEX,
    enabled: true,
    severity: 'medium',
    riskScore: 47,
    tags: ['MITRE', 'Domain: Network'],
    threat: {
      tacticId: 'TA0011',
      tacticName: 'Command and Control',
      techniqueId: 'T1071',
      techniqueName: 'Application Layer Protocol',
    },
  },
  {
    name: 'Office Spawning Windows Command Shell',
    description: 'Detects winword.exe or excel.exe spawning cmd.exe on Windows endpoints',
    query: 'process.parent.name:("winword.exe" or "excel.exe") and process.name:cmd.exe',
    index: ENDPOINT_INDEX,
    enabled: true,
    severity: 'high',
    riskScore: 71,
    tags: ['MITRE', 'OS: Windows', 'Technique: T1059'],
    threat: {
      tacticId: 'TA0002',
      tacticName: 'Execution',
      techniqueId: 'T1059',
      techniqueName: 'Command and Scripting Interpreter',
    },
  },
  {
    name: 'Suspicious kubectl exec in Staging Namespace',
    description: 'Detects interactive kubectl exec sessions into pods in the staging namespace',
    query:
      'kubernetes.audit.verb:"create" and kubernetes.audit.objectRef.subresource:"exec" ' +
      'and kubernetes.audit.objectRef.namespace:"staging"',
    index: KUBERNETES_INDEX,
    enabled: true,
    severity: 'high',
    riskScore: 66,
    tags: ['MITRE', 'Domain: Cloud'],
    threat: {
      tacticId: 'TA0002',
      tacticName: 'Execution',
      techniqueId: 'T1609',
      techniqueName: 'Container Administration Command',
    },
  },
];

/** Rule names the skill must be able to name back, keyed for readable assertions. */
export const COVERAGE_RULE_NAMES = {
  powershell: 'Suspicious PowerShell Execution',
  smb: 'Lateral Movement via SMB',
  dnsTunneling: 'Anomalous Outbound Connection Burst',
  officeCmd: 'Office Spawning Windows Command Shell',
  kubectlStaging: 'Suspicious kubectl exec in Staging Namespace',
} as const;

const buildRuleBody = (rule: CoverageFixtureRule): Record<string, unknown> => ({
  name: rule.name,
  description: rule.description,
  query: rule.query,
  index: [rule.index],
  type: 'query',
  language: 'kuery',
  enabled: rule.enabled,
  severity: rule.severity,
  risk_score: rule.riskScore,
  tags: rule.tags,
  interval: '5m',
  from: 'now-6m',
  to: 'now',
  author: [],
  false_positives: [],
  references: [],
  actions: [],
  threat: [
    {
      framework: 'MITRE ATT&CK',
      tactic: {
        id: rule.threat.tacticId,
        name: rule.threat.tacticName,
        reference: `https://attack.mitre.org/tactics/${rule.threat.tacticId}/`,
      },
      technique: [
        {
          id: rule.threat.techniqueId,
          name: rule.threat.techniqueName,
          reference: `https://attack.mitre.org/techniques/${rule.threat.techniqueId}/`,
        },
      ],
    },
  ],
});

export interface SeededCoverageFixtures {
  cleanup: () => Promise<void>;
}

/**
 * Seeds the coverage fixtures, removing leftovers from a crashed run first so a rerun is
 * idempotent. Only fixture-named rules are touched; unrelated rules in the space survive.
 */
export async function seedDetectionCoverageFixtures({
  kbnClient,
  log,
}: {
  kbnClient: KbnClient;
  log: ToolingLog;
}): Promise<SeededCoverageFixtures> {
  const fixtureNames = new Set(COVERAGE_FIXTURE_RULES.map((rule) => rule.name));

  const deleteFixtureRules = async () => {
    try {
      const { data } = await kbnClient.request<{
        data: Array<{ id: string; name: string }>;
      }>({
        path: `${DETECTION_RULES_URL}/_find?per_page=200`,
        method: 'GET',
        headers: { 'elastic-api-version': DETECTION_API_VERSION },
      });
      const stale = (data?.data ?? []).filter((rule) => fixtureNames.has(rule.name));
      for (const rule of stale) {
        await kbnClient.request({
          path: `${DETECTION_RULES_URL}?id=${rule.id}`,
          method: 'DELETE',
          headers: { 'elastic-api-version': DETECTION_API_VERSION },
        });
      }
      if (stale.length) {
        log.info(`[detection-coverage eval] removed ${stale.length} leftover fixture rule(s)`);
      }
    } catch (error) {
      log.warning(`[detection-coverage eval] fixture cleanup skipped: ${error}`);
    }
  };

  await deleteFixtureRules();

  for (const rule of COVERAGE_FIXTURE_RULES) {
    await kbnClient.request({
      path: DETECTION_RULES_URL,
      method: 'POST',
      headers: { 'elastic-api-version': DETECTION_API_VERSION },
      body: buildRuleBody(rule),
    });
  }
  log.info(`[detection-coverage eval] seeded ${COVERAGE_FIXTURE_RULES.length} fixture rules`);

  return { cleanup: deleteFixtureRules };
}
