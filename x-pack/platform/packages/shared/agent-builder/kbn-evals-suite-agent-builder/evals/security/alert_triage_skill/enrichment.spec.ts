/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Grounded evals for Entity Analytics enrichment in alert-triage.
 *
 * Each scenario re-ranks a lower base-score alert above a higher base-score peer:
 *   Entity risk:     EVAL-RISK-HOST (50 + Critical +25 = 75) beats EVAL-RISK-PLAIN (65)
 *   Criticality:     EVAL-CRIT-HOST (55 + extreme_impact +20 = 75) beats EVAL-CRIT-PLAIN (70)
 *
 * Evaluators: RequiredAlertIdsInResponse, RequiredTermsInResponse, ExpectedSkillInvocation,
 * ToolUsageOnly, LLM judges. CODE evaluators skip when seeding fails.
 */

import { tags } from '@kbn/scout';
import { evaluate } from './evaluate_setup';
import { seedEnrichmentFixtures, type SeededEnrichmentFixtures } from './alert_triage_fixtures';

evaluate.describe(
  'Alert Triage - entity enrichment',
  { tag: [...tags.serverless.security.complete] },
  () => {
    let fixtures: SeededEnrichmentFixtures | undefined;
    let teardown: (() => Promise<void>) | undefined;

    evaluate.beforeAll(async ({ esClient, log }) => {
      const seeded = await seedEnrichmentFixtures({ esClient, log });
      fixtures = seeded?.fixtures;
      teardown = seeded?.cleanup;
    });

    evaluate.afterAll(async () => {
      await teardown?.();
    });

    evaluate(
      'entity risk re-ranks Critical host above higher base score',
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
                    'Top ranked group is host EVAL-RISK-HOST with Critical entity risk from Entity Analytics ' +
                    '(+25 entityRiskBoost), re-ranking it above EVAL-RISK-PLAIN despite a lower base alert ' +
                    'risk score. Response cites EVAL-RISK-HOST, Critical entity risk level, and top alert ID ' +
                    `${entityRisk?.enrichedAlertId ?? '<enriched-id>'}. ` +
                    'Presentation order of these facts does not affect correctness.',
                },
                metadata: {
                  query_intent: 'Alert Triage - Entity Risk Enrichment',
                  expectedSkill: 'alert-triage',
                  expectedOnlyToolId: 'security.alert-triage',
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
      'asset criticality re-ranks watchlist host above higher base score',
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
                    'Top ranked group is host EVAL-CRIT-HOST with extreme_impact asset criticality ' +
                    '(+20 assetCriticalityBoost), re-ranking it above EVAL-CRIT-PLAIN despite a lower base ' +
                    'alert risk score. Response cites EVAL-CRIT-HOST, extreme_impact criticality level, ' +
                    'and top alert ID ' +
                    `${assetCriticality?.watchlistAlertId ?? '<watchlist-id>'}. ` +
                    'Presentation order of these facts does not affect correctness.',
                },
                metadata: {
                  query_intent: 'Alert Triage - Asset Criticality Enrichment',
                  expectedSkill: 'alert-triage',
                  expectedOnlyToolId: 'security.alert-triage',
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
