/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { EsClient } from '@kbn/scout';
import type { ToolingLog } from '@kbn/tooling-log';

const ALERTS_INDEX = '.alerts-security.alerts-default';
const RISK_INDEX = 'risk-score.risk-score-latest-default';
const CRITICALITY_INDEX = '.asset-criticality.asset-criticality-default';

/**
 * Explicit keyword mappings mirroring the real Entity Analytics schema. These are applied only
 * when the index does not already exist (cold environment where the Risk Engine / asset
 * criticality was never initialized). Without them, dynamic mapping would type `host.name`,
 * `id_value`, etc. as `text`, and the enrichment service's `terms` queries — which match exact
 * keyword values — would silently return nothing, making the enrichment evals non-deterministic.
 * When the index already exists with its real mapping, we skip creation and reuse it.
 */
const RISK_INDEX_MAPPINGS: MappingTypeMapping = {
  properties: {
    '@timestamp': { type: 'date' },
    host: {
      properties: {
        name: { type: 'keyword' },
        risk: {
          properties: {
            calculated_level: { type: 'keyword' },
            calculated_score_norm: { type: 'float' },
          },
        },
      },
    },
    user: {
      properties: {
        name: { type: 'keyword' },
        risk: {
          properties: {
            calculated_level: { type: 'keyword' },
            calculated_score_norm: { type: 'float' },
          },
        },
      },
    },
  },
};

const CRITICALITY_INDEX_MAPPINGS: MappingTypeMapping = {
  properties: {
    '@timestamp': { type: 'date' },
    id_field: { type: 'keyword' },
    id_value: { type: 'keyword' },
    criticality_level: { type: 'keyword' },
  },
};

const GROUNDED_EVAL_TAG = 'alert-triage-eval-seed';
const ENRICHMENT_EVAL_TAG = 'alert-triage-enrichment-eval-seed';

export interface SeededPriorityAlertIds {
  /** Critical Lateral Movement alert: risk_score(99) + boost(30) = 129 */
  critical: string;
  /** High Credential Access alert: risk_score(75) + boost(20) = 95 */
  high: string;
  /** Medium Discovery alert: risk_score(40) + boost(0) = 40 */
  medium: string;
}

export interface EntityRiskFixtures {
  enrichedAlertId: string;
  plainAlertId: string;
  riskDocId: string;
}

export interface AssetCriticalityFixtures {
  watchlistAlertId: string;
  plainAlertId: string;
  criticalityDocId: string;
}

export interface SeededEnrichmentFixtures {
  entityRisk: EntityRiskFixtures;
  assetCriticality: AssetCriticalityFixtures;
}

interface SeedResult<T> {
  fixtures: T;
  cleanup: () => Promise<void>;
}

interface MitreTactic {
  id: string;
  name: string;
}

const mitreTactic = (tactic: MitreTactic) => [
  {
    tactic: {
      id: tactic.id,
      name: tactic.name,
      reference: `https://attack.mitre.org/tactics/${tactic.id}/`,
    },
  },
];

const ensureIndexExists = async (
  esClient: EsClient,
  index: string,
  mappings: MappingTypeMapping
): Promise<void> => {
  const exists = await esClient.indices.exists({ index });
  if (!exists) {
    await esClient.indices.create({ index, mappings });
  }
};

const indexOpenAlert = async ({
  esClient,
  hostName,
  riskScore,
  ruleUuid,
  evalTag,
  ruleName,
  severity,
  threat,
  user,
}: {
  esClient: EsClient;
  hostName: string;
  riskScore: number;
  ruleUuid: string;
  evalTag: string;
  ruleName?: string;
  severity?: 'critical' | 'high' | 'medium';
  threat?: ReturnType<typeof mitreTactic>;
  user?: { name: string };
}): Promise<string> => {
  const result = await esClient.index({
    index: ALERTS_INDEX,
    document: {
      '@timestamp': new Date().toISOString(),
      'kibana.alert.risk_score': riskScore,
      'kibana.alert.severity': severity ?? (riskScore >= 70 ? 'high' : 'medium'),
      'kibana.alert.workflow_status': 'open',
      'kibana.alert.rule.name': ruleName ?? `Eval rule for ${hostName}`,
      'kibana.alert.rule.uuid': ruleUuid,
      'kibana.alert.rule.tags': [evalTag],
      ...(threat ? { 'kibana.alert.rule.threat': threat } : {}),
      host: { name: hostName },
      ...(user ? { user } : {}),
    },
    refresh: 'true',
  });

  return result._id;
};

const deleteAlertsByIds = async (
  esClient: EsClient,
  alertIds: readonly string[]
): Promise<void> => {
  if (alertIds.length === 0) {
    return;
  }

  await esClient.deleteByQuery({
    index: ALERTS_INDEX,
    query: { ids: { values: [...alertIds] } },
    refresh: true,
    ignore_unavailable: true,
  });
};

export async function seedPriorityAlerts({
  esClient,
  log,
}: {
  esClient: EsClient;
  log: ToolingLog;
}): Promise<SeedResult<SeededPriorityAlertIds> | undefined> {
  try {
    const [critical, high, medium] = await Promise.all([
      indexOpenAlert({
        esClient,
        hostName: 'EVAL-DC01',
        riskScore: 99,
        ruleUuid: 'alert-triage-eval-rule-lateral-001',
        evalTag: GROUNDED_EVAL_TAG,
        ruleName: 'Remote Service Creation via Named Pipe',
        severity: 'critical',
        threat: mitreTactic({ id: 'TA0008', name: 'Lateral Movement' }),
        user: { name: 'Administrator' },
      }),
      indexOpenAlert({
        esClient,
        hostName: 'EVAL-WORKSTATION-01',
        riskScore: 75,
        ruleUuid: 'alert-triage-eval-rule-cred-002',
        evalTag: GROUNDED_EVAL_TAG,
        ruleName: 'Credential Access via LSASS Memory',
        severity: 'high',
        threat: mitreTactic({ id: 'TA0006', name: 'Credential Access' }),
      }),
      indexOpenAlert({
        esClient,
        hostName: 'EVAL-SCANNER-01',
        riskScore: 40,
        ruleUuid: 'alert-triage-eval-rule-discovery-003',
        evalTag: GROUNDED_EVAL_TAG,
        ruleName: 'Network Port Scan Detected',
        severity: 'medium',
        threat: mitreTactic({ id: 'TA0007', name: 'Discovery' }),
      }),
    ]);

    const fixtures: SeededPriorityAlertIds = { critical, high, medium };

    log.info(
      `[alert-triage-grounded] seeded ${Object.keys(fixtures).length} test alerts — ` +
        `critical=${fixtures.critical}, high=${fixtures.high}, medium=${fixtures.medium}`
    );

    return {
      fixtures,
      cleanup: async () => {
        try {
          await deleteAlertsByIds(esClient, Object.values(fixtures));
          log.info('[alert-triage-grounded] cleaned up seeded test alerts');
        } catch (err) {
          log.warning(
            `[alert-triage-grounded] cleanup failed: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        }
      },
    };
  } catch (err) {
    log.warning(
      `[alert-triage-grounded] could not seed test alerts (index may not exist or environment ` +
        `is not running Kibana Security). RequiredAlertIdsInResponse evaluator will be skipped. ` +
        `Error: ${err instanceof Error ? err.message : String(err)}`
    );
    return undefined;
  }
}

export async function seedEnrichmentFixtures({
  esClient,
  log,
}: {
  esClient: EsClient;
  log: ToolingLog;
}): Promise<SeedResult<SeededEnrichmentFixtures> | undefined> {
  try {
    await Promise.all([
      ensureIndexExists(esClient, RISK_INDEX, RISK_INDEX_MAPPINGS),
      ensureIndexExists(esClient, CRITICALITY_INDEX, CRITICALITY_INDEX_MAPPINGS),
    ]);

    const now = new Date().toISOString();

    const [
      enrichedAlertId,
      plainRiskAlertId,
      watchlistAlertId,
      plainCritAlertId,
      riskDoc,
      criticalityDoc,
    ] = await Promise.all([
      indexOpenAlert({
        esClient,
        hostName: 'EVAL-RISK-HOST',
        riskScore: 50,
        ruleUuid: 'alert-triage-enrichment-risk-001',
        evalTag: ENRICHMENT_EVAL_TAG,
      }),
      indexOpenAlert({
        esClient,
        hostName: 'EVAL-RISK-PLAIN',
        riskScore: 65,
        ruleUuid: 'alert-triage-enrichment-risk-002',
        evalTag: ENRICHMENT_EVAL_TAG,
      }),
      indexOpenAlert({
        esClient,
        hostName: 'EVAL-CRIT-HOST',
        riskScore: 55,
        ruleUuid: 'alert-triage-enrichment-crit-001',
        evalTag: ENRICHMENT_EVAL_TAG,
      }),
      indexOpenAlert({
        esClient,
        hostName: 'EVAL-CRIT-PLAIN',
        riskScore: 70,
        ruleUuid: 'alert-triage-enrichment-crit-002',
        evalTag: ENRICHMENT_EVAL_TAG,
      }),
      esClient.index({
        index: RISK_INDEX,
        document: {
          '@timestamp': now,
          host: {
            name: 'EVAL-RISK-HOST',
            risk: { calculated_level: 'Critical', calculated_score_norm: 95 },
          },
        },
        refresh: 'true',
      }),
      esClient.index({
        index: CRITICALITY_INDEX,
        document: {
          '@timestamp': now,
          id_field: 'host.name',
          id_value: 'EVAL-CRIT-HOST',
          criticality_level: 'extreme_impact',
        },
        refresh: 'true',
      }),
    ]);

    const fixtures: SeededEnrichmentFixtures = {
      entityRisk: {
        enrichedAlertId,
        plainAlertId: plainRiskAlertId,
        riskDocId: riskDoc._id,
      },
      assetCriticality: {
        watchlistAlertId,
        plainAlertId: plainCritAlertId,
        criticalityDocId: criticalityDoc._id,
      },
    };

    log.info(
      `[alert-triage-enrichment] seeded entity risk alerts ` +
        `(enriched=${fixtures.entityRisk.enrichedAlertId}, plain=${fixtures.entityRisk.plainAlertId}) ` +
        `and asset criticality alerts ` +
        `(watchlist=${fixtures.assetCriticality.watchlistAlertId}, plain=${fixtures.assetCriticality.plainAlertId})`
    );

    return {
      fixtures,
      cleanup: async () => {
        try {
          await Promise.all([
            deleteAlertsByIds(esClient, [
              fixtures.entityRisk.enrichedAlertId,
              fixtures.entityRisk.plainAlertId,
              fixtures.assetCriticality.watchlistAlertId,
              fixtures.assetCriticality.plainAlertId,
            ]),
            esClient.delete({
              index: RISK_INDEX,
              id: fixtures.entityRisk.riskDocId,
              refresh: true,
            }),
            esClient.delete({
              index: CRITICALITY_INDEX,
              id: fixtures.assetCriticality.criticalityDocId,
              refresh: true,
            }),
          ]);
          log.info('[alert-triage-enrichment] cleaned up seeded enrichment fixtures');
        } catch (err) {
          log.warning(
            `[alert-triage-enrichment] cleanup failed: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        }
      },
    };
  } catch (err) {
    log.warning(
      `[alert-triage-enrichment] could not seed enrichment fixtures — CODE evaluators will skip. ` +
        `Error: ${err instanceof Error ? err.message : String(err)}`
    );
    return undefined;
  }
}
