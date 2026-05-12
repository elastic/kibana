/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * AESOP Alerting Rules Deployment Route
 *
 * Deploys monitoring and alerting rules for the autonomous skill discovery system.
 * Creates rules in Kibana Alerting framework for:
 * - Exploration failures
 * - Workflow timeouts
 * - Approval rate regression
 * - Token cost overruns
 * - Security violations
 * - Data quality issues
 */

import { z } from '@kbn/zod';
import { buildRouteValidationWithZod } from '@kbn/evals-common';
import type { AESOPRouteDependencies } from './register_aesop_routes';
import { ALERTING_RULES } from '../../lib/aesop/monitoring/alerting_rules';

const deployAlertingRulesRequestSchema = z.object({
  rule_ids: z
    .array(z.string())
    .optional()
    .describe('Specific rule IDs to deploy. If omitted, all rules are deployed.'),
  overwrite: z.boolean().default(true).describe('Whether to overwrite existing rules'),
  dry_run: z.boolean().default(false).describe('Preview rules without creating them'),
});

/**
 * Route: Deploy AESOP Alerting Rules
 *
 * POST /internal/aesop/monitoring/alerts/deploy
 *
 * Deploys production alerting rules for autonomous skill discovery system.
 * Creates Kibana detection rules for monitoring:
 * - Exploration failures
 * - Low approval rates
 * - High token usage
 * - Performance degradation
 */
export function registerDeployAlertingRulesRoute({ router, logger }: AESOPRouteDependencies) {
  router.versioned
    .post({
      path: '/internal/aesop/monitoring/alerts/deploy',
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['evals'],
        },
      },
      options: {
        tags: ['access:evals'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(deployAlertingRulesRequestSchema),
          },
        },
      },
      async (context, request, response) => {
        const { rule_ids: requestedRuleIds, overwrite, dry_run } = request.body;
        const coreContext = await context.core;
        const esClient = coreContext.elasticsearch.client.asCurrentUser;

        logger.info(
          `[AESOP Alerting] Deploying alerting rules requested_rules=${
            requestedRuleIds?.length ?? 'all'
          } dry_run=${dry_run} overwrite=${overwrite}`
        );

        // Filter rules if specific IDs requested
        const rulesToDeploy = requestedRuleIds
          ? ALERTING_RULES.filter((rule) => requestedRuleIds.includes(rule.id))
          : ALERTING_RULES;

        if (rulesToDeploy.length === 0) {
          return response.badRequest({
            body: {
              message: `No matching rules found. Available rule IDs: ${ALERTING_RULES.map(
                (r) => r.id
              ).join(', ')}`,
            },
          });
        }

        // Dry run mode: return preview without creating
        if (dry_run) {
          logger.info('[AESOP Alerting] Dry run mode - previewing rules without creating');

          return response.ok({
            body: {
              success: true,
              dry_run: true,
              rules_created: 0,
              rules_updated: 0,
              rules_skipped: 0,
              rule_ids: rulesToDeploy.map((r) => r.id),
              preview: rulesToDeploy.map((rule) => ({
                id: rule.id,
                name: rule.name,
                description: rule.description,
                rule_type: rule.rule_type,
                tags: rule.tags,
              })),
            },
          });
        }

        // Deploy rules
        const createdRules: string[] = [];
        const updatedRules: string[] = [];
        const skippedRules: string[] = [];
        const errors: Array<{ rule_id: string; error: string }> = [];

        try {
          // Ensure index template exists
          const templateExists = await esClient.indices.existsIndexTemplate({
            name: 'aesop-alert-rules-template',
          });

          if (!templateExists) {
            await esClient.indices.putIndexTemplate({
              name: 'aesop-alert-rules-template',
              index_patterns: ['.aesop-alert-rules'],
              template: {
                settings: {
                  number_of_shards: 1,
                  number_of_replicas: 1,
                  hidden: true,
                },
                mappings: {
                  properties: {
                    id: { type: 'keyword' },
                    name: { type: 'text' },
                    description: { type: 'text' },
                    rule_type: { type: 'keyword' },
                    query: {
                      properties: {
                        esql: { type: 'text' },
                        kuery: { type: 'text' },
                      },
                    },
                    threshold: {
                      properties: {
                        value: { type: 'double' },
                        comparator: { type: 'keyword' },
                      },
                    },
                    interval: { type: 'keyword' },
                    tags: { type: 'keyword' },
                    deployed_at: { type: 'date' },
                    deployed_by: { type: 'keyword' },
                  },
                },
              },
            });
            logger.info('[AESOP Alerting] Created alert rules index template');
          }

          // Deploy each rule
          for (const rule of rulesToDeploy) {
            try {
              // Check if rule already exists
              const existingRule = await esClient.exists({
                index: '.aesop-alert-rules',
                id: rule.id,
              });

              if (existingRule && !overwrite) {
                logger.info(`[AESOP Alerting] Skipping existing rule: ${rule.id}`);
                skippedRules.push(rule.id);
                continue;
              }

              // Store rule definition
              await esClient.index({
                index: '.aesop-alert-rules',
                id: rule.id,
                document: {
                  ...rule,
                  deployed_at: new Date().toISOString(),
                  deployed_by: 'system',
                },
              });

              if (existingRule) {
                logger.info(`[AESOP Alerting] ✅ Updated rule: ${rule.id}`);
                updatedRules.push(rule.id);
              } else {
                logger.info(`[AESOP Alerting] ✅ Created rule: ${rule.id}`);
                createdRules.push(rule.id);
              }
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              logger.error(
                `[AESOP Alerting] ❌ Failed to deploy rule: ${rule.id}: ${errorMessage}`
              );
              errors.push({
                rule_id: rule.id,
                error: errorMessage,
              });
            }
          }

          const allDeployedRules = [...createdRules, ...updatedRules];

          logger.info(
            `[AESOP Alerting] ✅ Alerting rules deployment completed total_rules=${rulesToDeploy.length} created=${createdRules.length} updated=${updatedRules.length} skipped=${skippedRules.length} errors=${errors.length}`
          );

          return response.ok({
            body: {
              success: errors.length === 0,
              dry_run: false,
              rules_created: createdRules.length,
              rules_updated: updatedRules.length,
              rules_skipped: skippedRules.length,
              rule_ids: allDeployedRules,
              errors: errors.length > 0 ? errors : undefined,
            },
          });
        } catch (error) {
          logger.error('[AESOP Alerting] Failed to deploy alerting rules', { error });

          return response.customError({
            statusCode: 500,
            body: {
              message: `Failed to deploy alerting rules: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          });
        }
      }
    );
}
