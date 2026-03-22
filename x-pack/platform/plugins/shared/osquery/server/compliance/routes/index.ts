/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import { schema } from '@kbn/config-schema';
import { COMPLIANCE_API_BASE } from '../../../common/compliance';
import type { CompliancePlatform } from '../../../common/compliance';
import {
  findComplianceRules,
  getComplianceRule,
  createComplianceRule,
  updateComplianceRule,
  deleteComplianceRule,
  bulkActionComplianceRules,
  listBenchmarks,
  getMutedRulesState,
  getDashboardStats,
  getScoreTrend,
  findComplianceFindings,
  generateDetectionRuleTemplate,
  generateBulkDetectionRules,
  runComplianceCheck,
} from '../services';
import { complianceCleanupRoutes } from './cleanup';

const ROUTE_SECURITY_READ = {
  authz: { requiredPrivileges: ['osquery'] },
};
const ROUTE_SECURITY_WRITE = {
  authz: { requiredPrivileges: ['osquery'] },
};

export const initComplianceRoutes = (router: IRouter<DataRequestHandlerContext>) => {
  // --- Benchmarks ---
  router.versioned
    .get({ path: `${COMPLIANCE_API_BASE}/benchmarks`, access: 'internal', security: ROUTE_SECURITY_READ })
    .addVersion({ version: '1', validate: false }, async (context, _req, res) => {
      const soClient = (await context.core).savedObjects.client;
      const benchmarks = await listBenchmarks(soClient);

      return res.ok({ body: { benchmarks } });
    });

  // --- Rules CRUD ---
  router.versioned
    .get({
      path: `${COMPLIANCE_API_BASE}/rules/_find`,
      access: 'internal',
      security: ROUTE_SECURITY_READ,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: schema.object({
              benchmark_id: schema.maybe(schema.string()),
              platform: schema.maybe(schema.string()),
              section: schema.maybe(schema.string()),
              level: schema.maybe(schema.number()),
              enabled: schema.maybe(schema.boolean()),
              page: schema.maybe(schema.number({ min: 1 })),
              per_page: schema.maybe(schema.number({ min: 1, max: 100 })),
              search: schema.maybe(schema.string()),
            }),
          },
        },
      },
      async (context, req, res) => {
        const soClient = (await context.core).savedObjects.client;
        const result = await findComplianceRules(soClient, {
          benchmarkId: req.query.benchmark_id,
          platform: req.query.platform,
          section: req.query.section,
          level: req.query.level,
          enabled: req.query.enabled,
          page: req.query.page,
          perPage: req.query.per_page,
          search: req.query.search,
        });

        return res.ok({ body: result });
      }
    );

  router.versioned
    .get({
      path: `${COMPLIANCE_API_BASE}/rules/{id}`,
      access: 'internal',
      security: ROUTE_SECURITY_READ,
    })
    .addVersion(
      { version: '1', validate: { request: { params: schema.object({ id: schema.string() }) } } },
      async (context, req, res) => {
        const soClient = (await context.core).savedObjects.client;
        try {
          const rule = await getComplianceRule(soClient, req.params.id);

          return res.ok({ body: rule });
        } catch {
          return res.notFound();
        }
      }
    );

  router.versioned
    .post({
      path: `${COMPLIANCE_API_BASE}/rules`,
      access: 'internal',
      security: ROUTE_SECURITY_WRITE,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: schema.object({
              rule_id: schema.string(),
              name: schema.string(),
              description: schema.string(),
              query: schema.string(),
              remediation: schema.string(),
              benchmark_id: schema.string(),
              benchmark_name: schema.string(),
              benchmark_version: schema.string(),
              rule_number: schema.string(),
              section: schema.string(),
              level: schema.number({ min: 1, max: 2 }),
              platform: schema.oneOf([
                schema.literal('darwin'),
                schema.literal('windows'),
                schema.literal('linux'),
              ]),
              frameworks: schema.arrayOf(
                schema.object({
                  id: schema.string(),
                  version: schema.string(),
                  control: schema.string(),
                }),
                { defaultValue: [] }
              ),
              tags: schema.arrayOf(schema.string(), { defaultValue: [] }),
              enabled: schema.boolean({ defaultValue: true }),
              interval: schema.number({ defaultValue: 300, min: 60, max: 86400 }),
              resource_type: schema.string({ defaultValue: 'custom' }),
            }),
          },
        },
      },
      async (context, req, res) => {
        const soClient = (await context.core).savedObjects.client;
        const { benchmark_id, benchmark_name, benchmark_version, ...ruleFields } = req.body;
        const rule = await createComplianceRule(soClient, {
          ...ruleFields,
          prebuilt: false,
          benchmark: {
            id: benchmark_id,
            name: benchmark_name,
            version: benchmark_version,
            posture_type: 'endpoint',
          },
        });

        return res.ok({ body: rule });
      }
    );

  router.versioned
    .put({
      path: `${COMPLIANCE_API_BASE}/rules/{id}`,
      access: 'internal',
      security: ROUTE_SECURITY_WRITE,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: schema.object({ id: schema.string() }),
            body: schema.object({
              name: schema.maybe(schema.string()),
              description: schema.maybe(schema.string()),
              query: schema.maybe(schema.string()),
              remediation: schema.maybe(schema.string()),
              enabled: schema.maybe(schema.boolean()),
              interval: schema.maybe(schema.number({ min: 60, max: 86400 })),
              tags: schema.maybe(schema.arrayOf(schema.string())),
            }),
          },
        },
      },
      async (context, req, res) => {
        const soClient = (await context.core).savedObjects.client;
        const rule = await updateComplianceRule(soClient, req.params.id, req.body);

        return res.ok({ body: rule });
      }
    );

  router.versioned
    .delete({
      path: `${COMPLIANCE_API_BASE}/rules/{id}`,
      access: 'internal',
      security: ROUTE_SECURITY_WRITE,
    })
    .addVersion(
      { version: '1', validate: { request: { params: schema.object({ id: schema.string() }) } } },
      async (context, req, res) => {
        const soClient = (await context.core).savedObjects.client;
        try {
          await deleteComplianceRule(soClient, req.params.id);

          return res.ok({ body: { deleted: true } });
        } catch (error) {
          return res.badRequest({ body: { message: error.message } });
        }
      }
    );

  // --- Bulk Actions ---
  router.versioned
    .post({
      path: `${COMPLIANCE_API_BASE}/rules/_bulk_action`,
      access: 'internal',
      security: ROUTE_SECURITY_WRITE,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: schema.object({
              action: schema.oneOf([
                schema.literal('enable'),
                schema.literal('disable'),
                schema.literal('mute'),
                schema.literal('unmute'),
              ]),
              rule_ids: schema.arrayOf(schema.string(), { minSize: 1 }),
            }),
          },
        },
      },
      async (context, req, res) => {
        const soClient = (await context.core).savedObjects.client;
        const result = await bulkActionComplianceRules(
          soClient,
          req.body.action,
          req.body.rule_ids
        );

        return res.ok({ body: result });
      }
    );

  // --- Stats & Findings ---
  router.versioned
    .get({
      path: `${COMPLIANCE_API_BASE}/stats/{benchmark_id}`,
      access: 'internal',
      security: ROUTE_SECURITY_READ,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: schema.object({ benchmark_id: schema.string() }),
            query: schema.object({ time_range: schema.maybe(schema.oneOf([schema.literal('24h'), schema.literal('7d'), schema.literal('30d')])) }),
          },
        },
      },
      async (context, req, res) => {
        try {
          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;
          const soClient = coreContext.savedObjects.client;
          const mutedRules = await getMutedRulesState(soClient);
          const stats = await getDashboardStats(esClient, req.params.benchmark_id, mutedRules);
          const trend = await getScoreTrend(
            esClient,
            req.params.benchmark_id,
            req.query.time_range
          );

          return res.ok({ body: { ...stats, trend } });
        } catch (error) {
          return res.customError({ statusCode: 500, body: { message: error.message } });
        }
      }
    );

  router.versioned
    .get({
      path: `${COMPLIANCE_API_BASE}/findings`,
      access: 'internal',
      security: ROUTE_SECURITY_READ,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: schema.object({
              benchmark_id: schema.maybe(schema.string()),
              section: schema.maybe(schema.string()),
              host_id: schema.maybe(schema.string()),
              evaluation: schema.maybe(schema.string()),
              page: schema.maybe(schema.number({ min: 1 })),
              per_page: schema.maybe(schema.number({ min: 1, max: 100 })),
            }),
          },
        },
      },
      async (context, req, res) => {
        try {
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;
          const result = await findComplianceFindings(esClient, {
            benchmarkId: req.query.benchmark_id,
            section: req.query.section,
            hostId: req.query.host_id,
            evaluation: req.query.evaluation,
            page: req.query.page,
            perPage: req.query.per_page,
          });

          return res.ok({ body: result });
        } catch (error) {
          return res.customError({ statusCode: 500, body: { message: error.message } });
        }
      }
    );

  // --- Detection Bridge ---
  router.versioned
    .post({
      path: `${COMPLIANCE_API_BASE}/rules/{id}/_generate_detection`,
      access: 'internal',
      security: ROUTE_SECURITY_WRITE,
    })
    .addVersion(
      { version: '1', validate: { request: { params: schema.object({ id: schema.string() }) } } },
      async (context, req, res) => {
        const soClient = (await context.core).savedObjects.client;
        try {
          const rule = await getComplianceRule(soClient, req.params.id);
          const template = generateDetectionRuleTemplate(rule);

          return res.ok({ body: template });
        } catch {
          return res.notFound();
        }
      }
    );

  router.versioned
    .post({
      path: `${COMPLIANCE_API_BASE}/rules/_generate_detection_rules`,
      access: 'internal',
      security: ROUTE_SECURITY_WRITE,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: schema.object({
              benchmark_id: schema.string(),
              existing_tags: schema.arrayOf(schema.string(), { defaultValue: [] }),
            }),
          },
        },
      },
      async (context, req, res) => {
        const soClient = (await context.core).savedObjects.client;
        const result = await findComplianceRules(soClient, {
          benchmarkId: req.body.benchmark_id,
          enabled: true,
          perPage: 200,
        });
        const { templates, skipped } = generateBulkDetectionRules(
          result.rules,
          req.body.existing_tags
        );

        return res.ok({ body: { templates, skipped, total: templates.length } });
      }
    );

  // --- Response Action ---
  router.versioned
    .post({
      path: `${COMPLIANCE_API_BASE}/check`,
      access: 'internal',
      security: ROUTE_SECURITY_WRITE,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: schema.object({
              platform: schema.oneOf([
                schema.literal('darwin'),
                schema.literal('windows'),
                schema.literal('linux'),
              ]),
            }),
          },
        },
      },
      async (context, req, res) => {
        const soClient = (await context.core).savedObjects.client;
        const noopLogger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {}, fatal: () => {}, trace: () => {} } as any;
        const result = await runComplianceCheck(
          soClient,
          req.body.platform as CompliancePlatform,
          noopLogger
        );
        return res.ok({ body: result });
      }
    );

  // --- Health & Validation ---
  router.versioned
    .get({
      path: `${COMPLIANCE_API_BASE}/health`,
      access: 'internal',
      security: ROUTE_SECURITY_READ,
    })
    .addVersion({ version: '1', validate: false }, async (context, _req, res) => {
      const esClient = (await context.core).elasticsearch.client.asCurrentUser;
      const fleet = context.fleet;
      const logger = context.osquery.logger.get('compliance.health');

      const { ComplianceHealthChecks } = await import('../lib/deployment/health_checks');
      const healthService = new ComplianceHealthChecks(esClient, fleet, logger);

      const health = await healthService.runAll();

      return res.ok({ body: health });
    });

  router.versioned
    .post({
      path: `${COMPLIANCE_API_BASE}/validate/deployment`,
      access: 'internal',
      security: ROUTE_SECURITY_READ,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: schema.object({
              benchmark_id: schema.string(),
              agent_policy_ids: schema.arrayOf(schema.string()),
            }),
          },
        },
      },
      async (context, req, res) => {
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        const soClient = (await context.core).savedObjects.client;
        const fleet = context.fleet;
        const logger = context.osquery.logger.get('compliance.validation');

        const { PreDeploymentValidation } = await import(
          '../lib/deployment/pre_deployment_validation'
        );
        const validationService = new PreDeploymentValidation(esClient, soClient, fleet, logger);

        const validation = await validationService.validatePackDeployment({
          benchmarkId: req.body.benchmark_id,
          agentPolicyIds: req.body.agent_policy_ids,
        });

        if (!validation.valid) {
          return res.badRequest({ body: validation });
        }

        return res.ok({ body: validation });
      }
    );

  router.versioned
    .post({
      path: `${COMPLIANCE_API_BASE}/validate/query`,
      access: 'internal',
      security: ROUTE_SECURITY_READ,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: schema.object({
              query: schema.string({ minLength: 1 }),
              platform: schema.maybe(
                schema.oneOf([
                  schema.literal('linux'),
                  schema.literal('darwin'),
                  schema.literal('windows'),
                ])
              ),
            }),
          },
        },
      },
      async (context, req, res) => {
        const logger = context.osquery.logger.get('compliance.query-validation');

        const { QueryValidationService } = await import(
          '../services/query_validation_service'
        );
        const validationService = new QueryValidationService(logger);

        const validation = await validationService.validateQuery(req.body.query, req.body.platform);

        return res.ok({ body: validation });
      }
    );

  router.versioned
    .post({
      path: `${COMPLIANCE_API_BASE}/sandbox/test`,
      access: 'internal',
      security: ROUTE_SECURITY_WRITE,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: schema.object({
              query: schema.string({ minLength: 1 }),
              agent_id: schema.maybe(schema.string()),
              platform: schema.maybe(
                schema.oneOf([
                  schema.literal('linux'),
                  schema.literal('darwin'),
                  schema.literal('windows'),
                ])
              ),
            }),
          },
        },
      },
      async (context, req, res) => {
        const soClient = (await context.core).savedObjects.client;
        const fleet = context.fleet;
        const logger = context.osquery.logger.get('compliance.sandbox');

        const { QuerySandboxService } = await import('../services/query_sandbox_service');
        const sandboxService = new QuerySandboxService(soClient, fleet, logger);

        const result = await sandboxService.testQuery(
          req.body.query,
          req.body.agent_id,
          req.body.platform
        );

        return res.ok({ body: result });
      }
    );

  router.versioned
    .get({
      path: `${COMPLIANCE_API_BASE}/metrics`,
      access: 'internal',
      security: ROUTE_SECURITY_READ,
    })
    .addVersion({ version: '1', validate: false }, async (context, _req, res) => {
      const esClient = (await context.core).elasticsearch.client.asCurrentUser;
      const taskManager = context.taskManager;
      const logger = context.osquery.logger.get('compliance.monitoring');

      const { DeploymentMonitoringService } = await import(
        '../lib/deployment/deployment_monitoring'
      );
      const monitoringService = new DeploymentMonitoringService(esClient, taskManager, logger);

      const metrics = await monitoringService.collectMetrics();

      return res.ok({ body: metrics });
    });

  // --- CSP Integration ---
  router.versioned
    .get({
      path: `${COMPLIANCE_API_BASE}/posture/unified`,
      access: 'internal',
      security: ROUTE_SECURITY_READ,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: schema.object({
              endpoint_weight: schema.maybe(schema.number({ min: 0, max: 1 })),
              cloud_weight: schema.maybe(schema.number({ min: 0, max: 1 })),
              kubernetes_weight: schema.maybe(schema.number({ min: 0, max: 1 })),
            }),
          },
        },
      },
      async (context, req, res) => {
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        const logger = context.osquery.logger.get('compliance.unified-scoring');

        const { CSPUnifiedScoringService } = await import(
          '../services/csp_unified_scoring_service'
        );
        const scoringService = new CSPUnifiedScoringService(esClient, logger);

        const weights = {
          endpoint: req.query.endpoint_weight,
          cloud: req.query.cloud_weight,
          kubernetes: req.query.kubernetes_weight,
        };

        const unifiedScore = await scoringService.calculateUnifiedScore(weights);

        return res.ok({ body: unifiedScore });
      }
    );

  router.versioned
    .get({
      path: `${COMPLIANCE_API_BASE}/reports/regulatory/templates`,
      access: 'internal',
      security: ROUTE_SECURITY_READ,
    })
    .addVersion({ version: '1', validate: false }, async (context, _req, res) => {
      const logger = context.osquery.logger.get('compliance.regulatory-templates');

      const { RegulatoryReportTemplates } = await import(
        '../services/regulatory_report_templates'
      );
      const templates = new RegulatoryReportTemplates(logger);

      const availableTemplates = templates.listAvailableTemplates();

      return res.ok({ body: { templates: availableTemplates } });
    });

  router.versioned
    .post({
      path: `${COMPLIANCE_API_BASE}/reports/regulatory`,
      access: 'internal',
      security: ROUTE_SECURITY_READ,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: schema.object({
              framework: schema.oneOf([
                schema.literal('soc2'),
                schema.literal('iso27001'),
                schema.literal('pci-dss'),
                schema.literal('nist-800-53'),
                schema.literal('hipaa'),
                schema.literal('gdpr'),
              ]),
              time_range: schema.object({
                from: schema.string(),
                to: schema.string(),
              }),
              filters: schema.maybe(schema.object({}, { unknowns: 'allow' })),
            }),
          },
        },
      },
      async (context, req, res) => {
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        const soClient = (await context.core).savedObjects.client;
        const logger = context.osquery.logger.get('compliance.regulatory-reports');

        const { RegulatoryReportTemplates } = await import(
          '../services/regulatory_report_templates'
        );
        const templates = new RegulatoryReportTemplates(logger);

        // Get compliance data for time range
        const complianceData = {}; // Would fetch actual data

        const report = await templates.generateRegulatoryReport(req.body.framework, complianceData);

        return res.ok({ body: report });
      }
    );

  // Register cleanup routes
  complianceCleanupRoutes(router);
};
