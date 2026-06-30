/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Grounded-output evals for Entity Analytics enrichment in the alert-triage skill.
 *
 * Seeds alerts plus entity risk / asset criticality documents, then verifies the
 * final response cites the enriched entity and its prioritization signals. Each
 * scenario is designed so enrichment re-ranks a lower base-score alert above a
 * higher base-score peer:
 *
 *   Entity risk:   EVAL-RISK-HOST (base 50 + Critical +25 = 75) beats EVAL-RISK-PLAIN (65)
 *   Criticality:   EVAL-CRIT-HOST (base 55 + extreme_impact +20 = 75) beats EVAL-CRIT-PLAIN (70)
 *
 * Evaluators:
 *   - RequiredAlertIdsInResponse: enriched alert _id must appear (proves re-ranking)
 *   - RequiredTermsInResponse: entity risk level / asset criticality level must surface
 *   - ExpectedSkillInvocation, ToolUsageOnly, LLM judges
 *
 * Graceful degradation: if seeding fails, CODE evaluators skip (empty arrays → score 1).
 */

import { tags } from '@kbn/scout';
import type { EsClient } from '@kbn/scout';
import type { ToolingLog } from '@kbn/tooling-log';
import { evaluate as base } from '../../src/evaluate';
import type { EvaluateDataset } from '../../src/evaluate_dataset';
import { createEvaluateDataset } from '../../src/evaluate_dataset';

const ALERTS_INDEX = '.alerts-security.alerts-default';
const RISK_INDEX = 'risk-score.risk-score-latest-default';
const CRITICALITY_INDEX = '.asset-criticality.asset-criticality-default';
const EVAL_TAG = 'alert-triage-enrichment-eval-seed';

interface EntityRiskFixtures {
  enrichedAlertId: string;
  plainAlertId: string;
  riskDocId: string;
}

interface AssetCriticalityFixtures {
  watchlistAlertId: string;
  plainAlertId: string;
  criticalityDocId: string;
}

interface SeededEnrichmentFixtures {
  entityRisk?: EntityRiskFixtures;
  assetCriticality?: AssetCriticalityFixtures;
}

const openAlertDoc = (
  hostName: string,
  riskScore: number,
  ruleUuid: string
): Record<string, unknown> => ({
  '@timestamp': new Date().toISOString(),
  'kibana.alert.risk_score': riskScore,
  'kibana.alert.severity': riskScore >= 70 ? 'high' : 'medium',
  'kibana.alert.workflow_status': 'open',
  'kibana.alert.rule.name': `Eval rule for ${hostName}`,
  'kibana.alert.rule.uuid': ruleUuid,
  'kibana.alert.rule.tags': [EVAL_TAG],
  host: { name: hostName },
});

const ensureIndexExists = async (esClient: EsClient, index: string): Promise<void> => {
  const exists = await esClient.indices.exists({ index });
  if (!exists) {
    await esClient.indices.create({ index });
  }
};

const evaluate = base.extend<{ evaluateDataset: EvaluateDataset }, {}>({
  evaluateDataset: [
    ({ chatClient, evaluators, executorClient, traceEsClient, log }, use) => {
      use(
        createEvaluateDataset({
          chatClient,
          evaluators,
          executorClient,
          traceEsClient,
          log,
        })
      );
    },
    { scope: 'test' },
  ],
});

evaluate.describe(
  'Security Skills - Alert Triage (Entity Analytics Enrichment)',
  { tag: [...tags.serverless.security.complete] },
  () => {
    let fixtures: SeededEnrichmentFixtures | undefined;

    evaluate.beforeAll(async ({ esClient, log }: { esClient: EsClient; log: ToolingLog }) => {
      const now = new Date().toISOString();

      try {
        await Promise.all([
          ensureIndexExists(esClient, RISK_INDEX),
          ensureIndexExists(esClient, CRITICALITY_INDEX),
        ]);

        const [
          enrichedRiskAlert,
          plainRiskAlert,
          watchlistAlert,
          plainCritAlert,
          riskDoc,
          criticalityDoc,
        ] = await Promise.all([
          // Entity risk scenario: lower base score, wins after Critical (+25) boost
          esClient.index({
            index: ALERTS_INDEX,
            document: openAlertDoc('EVAL-RISK-HOST', 50, 'alert-triage-enrichment-risk-001'),
            refresh: 'true',
          }),
          esClient.index({
            index: ALERTS_INDEX,
            document: openAlertDoc('EVAL-RISK-PLAIN', 65, 'alert-triage-enrichment-risk-002'),
            refresh: 'true',
          }),
          // Asset criticality scenario: lower base score, wins after extreme_impact (+20) boost
          esClient.index({
            index: ALERTS_INDEX,
            document: openAlertDoc('EVAL-CRIT-HOST', 55, 'alert-triage-enrichment-crit-001'),
            refresh: 'true',
          }),
          esClient.index({
            index: ALERTS_INDEX,
            document: openAlertDoc('EVAL-CRIT-PLAIN', 70, 'alert-triage-enrichment-crit-002'),
            refresh: 'true',
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

        fixtures = {
          entityRisk: {
            enrichedAlertId: enrichedRiskAlert._id,
            plainAlertId: plainRiskAlert._id,
            riskDocId: riskDoc._id,
          },
          assetCriticality: {
            watchlistAlertId: watchlistAlert._id,
            plainAlertId: plainCritAlert._id,
            criticalityDocId: criticalityDoc._id,
          },
        };

        log.info(
          `[alert-triage-enrichment] seeded entity risk alerts ` +
            `(enriched=${fixtures.entityRisk.enrichedAlertId}, plain=${fixtures.entityRisk.plainAlertId}) ` +
            `and asset criticality alerts ` +
            `(watchlist=${fixtures.assetCriticality.watchlistAlertId}, plain=${fixtures.assetCriticality.plainAlertId})`
        );
      } catch (err) {
        log.warning(
          `[alert-triage-enrichment] could not seed enrichment fixtures — CODE evaluators will skip. ` +
            `Error: ${err instanceof Error ? err.message : String(err)}`
        );
        fixtures = undefined;
      }
    });

    evaluate.afterAll(async ({ esClient, log }: { esClient: EsClient; log: ToolingLog }) => {
      if (!fixtures) return;

      const alertIds = [
        fixtures.entityRisk?.enrichedAlertId,
        fixtures.entityRisk?.plainAlertId,
        fixtures.assetCriticality?.watchlistAlertId,
        fixtures.assetCriticality?.plainAlertId,
      ].filter((id): id is string => typeof id === 'string');

      try {
        await Promise.all([
          alertIds.length > 0
            ? esClient.deleteByQuery({
                index: ALERTS_INDEX,
                query: { ids: { values: alertIds } },
                refresh: true,
                ignore_unavailable: true,
              })
            : Promise.resolve(),
          fixtures.entityRisk?.riskDocId
            ? esClient.delete({
                index: RISK_INDEX,
                id: fixtures.entityRisk.riskDocId,
                refresh: true,
                ignore_unavailable: true,
              })
            : Promise.resolve(),
          fixtures.assetCriticality?.criticalityDocId
            ? esClient.delete({
                index: CRITICALITY_INDEX,
                id: fixtures.assetCriticality.criticalityDocId,
                refresh: true,
                ignore_unavailable: true,
              })
            : Promise.resolve(),
        ]);
        log.info('[alert-triage-enrichment] cleaned up seeded enrichment fixtures');
      } catch (err) {
        log.warning(
          `[alert-triage-enrichment] cleanup failed: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    });

    evaluate(
      'triage response cites entity with Critical risk level and re-ranks above higher base score',
      async ({ evaluateDataset }) => {
        const entityRisk = fixtures?.entityRisk;
        await evaluateDataset({
          dataset: {
            name: 'agent builder: security-alert-triage-entity-risk-enrichment',
            description:
              'Validates that Entity Analytics entity risk enrichment re-ranks EVAL-RISK-HOST ' +
              '(base risk 50 + Critical entity risk boost +25 = 75) above EVAL-RISK-PLAIN (base 65), ' +
              'and that the response cites the Critical entity risk level.',
            examples: [
              {
                input: {
                  question:
                    'What alerts should I look at right now? Prioritize by entity risk where available.',
                },
                output: {
                  expected:
                    'The top group should be on host EVAL-RISK-HOST despite a lower base alert risk score ' +
                    'than EVAL-RISK-PLAIN, because EVAL-RISK-HOST carries a Critical entity risk level ' +
                    'from Entity Analytics (+25 boost). The response must cite EVAL-RISK-HOST, mention ' +
                    'Critical entity risk, and include the top alert ID ' +
                    `${entityRisk?.enrichedAlertId ?? '<enriched-id>'}.`,
                },
                metadata: {
                  query_intent: 'Alert Triage - Entity Risk Enrichment',
                  expectedSkill: 'alert-triage',
                  expectedOnlyToolId: 'security.alert-triage.prioritize-alerts',
                  requiredAlertIds: entityRisk ? [entityRisk.enrichedAlertId] : [],
                  requiredTerms: entityRisk ? ['Critical', 'EVAL-RISK-HOST'] : [],
                },
              },
            ],
          },
        });
      }
    );

    evaluate(
      'triage response cites asset criticality and re-ranks watchlist host above higher base score',
      async ({ evaluateDataset }) => {
        const assetCriticality = fixtures?.assetCriticality;
        await evaluateDataset({
          dataset: {
            name: 'agent builder: security-alert-triage-asset-criticality-enrichment',
            description:
              'Validates that asset criticality (watchlist signal) re-ranks EVAL-CRIT-HOST ' +
              '(base risk 55 + extreme_impact criticality boost +20 = 75) above EVAL-CRIT-PLAIN (base 70), ' +
              'and that the response cites the extreme_impact criticality level.',
            examples: [
              {
                input: {
                  question:
                    'Prioritize the alert queue. Call out any hosts with high asset criticality.',
                },
                output: {
                  expected:
                    'The top group should be on host EVAL-CRIT-HOST despite a lower base alert risk score ' +
                    'than EVAL-CRIT-PLAIN, because EVAL-CRIT-HOST has extreme_impact asset criticality ' +
                    '(+20 boost). The response must cite EVAL-CRIT-HOST, mention extreme_impact asset ' +
                    'criticality, and include the top alert ID ' +
                    `${assetCriticality?.watchlistAlertId ?? '<watchlist-id>'}.`,
                },
                metadata: {
                  query_intent: 'Alert Triage - Asset Criticality Enrichment',
                  expectedSkill: 'alert-triage',
                  expectedOnlyToolId: 'security.alert-triage.prioritize-alerts',
                  requiredAlertIds: assetCriticality ? [assetCriticality.watchlistAlertId] : [],
                  requiredTerms: assetCriticality ? ['extreme_impact', 'EVAL-CRIT-HOST'] : [],
                },
              },
            ],
          },
        });
      }
    );
  }
);
