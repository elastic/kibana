/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';

/**
 * Test plugin for verifying CPS (Cross Project Search) behavior with internal user.
 *
 * This plugin exposes test routes to verify that ES correctly routes internal user requests
 * to the origin project, even when project_routing is set to values other than origin.
 *
 * Context: In a CPS-enabled serverless environment with linked projects, we need to confirm
 * that internal user requests are always routed to the origin project regardless of the
 * project_routing parameter value.
 *
 * Test scenarios:
 * 1. Search system index with internal user + project_routing set to non-origin values
 * 2. Search data index with internal user + project_routing set to non-origin values
 *
 * The routes can be called from the browser console or via curl to trigger the tests.
 */

interface TestScenarioResult {
  scenario: string;
  success: boolean;
  statusCode?: number;
  error?: string;
  details?: {
    indexSearched: string;
    projectRouting: string;
    hitsCount?: number;
    message?: string;
  };
}

interface TestResults {
  timestamp: string;
  environment: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
  scenarios: TestScenarioResult[];
}

export function initRoutes(core: CoreSetup) {
  const router = core.http.createRouter();

  /**
   * Main test endpoint - runs all CPS internal user scenarios
   *
   * Usage from browser console:
   * ```
   * fetch('/internal/cps_test/run_all', {
   *   method: 'POST',
   *   headers: {
   *     'kbn-xsrf': 'true',
   *     'Content-Type': 'application/json'
   *   },
   *   body: JSON.stringify({
   *     systemIndex: '.kibana',
   *     dataIndex: 'logs-*',
   *     projectRoutingValues: ['your-linked-project-alias']
   *   })
   * }).then(r => r.json()).then(console.log)
   * ```
   *
   * Usage from terminal (against QA):
   * ```
   * curl -X POST https://your-kibana.qa.elastic.co/internal/cps_test/run_all \
   *   -u username:password \
   *   -H 'kbn-xsrf: true' \
   *   -H 'Content-Type: application/json' \
   *   -d '{
   *     "systemIndex": ".kibana",
   *     "dataIndex": "logs-*",
   *     "projectRoutingValues": ["your-linked-project-alias", "_alias:_all"]
   *   }'
   * ```
   *
   * Example with actual project alias from QA:
   * ```
   * curl -X POST https://origin-project.qa.elastic.co/internal/cps_test/run_all \
   *   -u username:password \
   *   -H 'kbn-xsrf: true' \
   *   -H 'Content-Type: application/json' \
   *   -d '{
   *     "systemIndex": ".kibana",
   *     "dataIndex": "kibana_sample_data_flights",
   *     "projectRoutingValues": ["keepbriando-cps-test-proj-linked-ce713c"]
   *   }'
   * ```
   */
  router.post(
    {
      path: '/internal/cps_test/run_all',
      validate: {
        body: schema.object({
          systemIndex: schema.string({ defaultValue: '.kibana' }),
          dataIndex: schema.string({ defaultValue: 'logs-*' }),
          linkedOnlyIndex: schema.maybe(schema.string()),
          projectRoutingValues: schema.arrayOf(schema.string(), {
            // Default to common routing expressions
            // In QA, replace these with actual linked project aliases (e.g., 'your-linked-project-id')
            defaultValue: ['_alias:_origin', '_alias:_all'],
          }),
        }),
      },
      options: {
        authRequired: true,
        access: 'internal',
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This is a test endpoint for CPS validation',
        },
      },
    },
    async (context, request, response) => {
      const { systemIndex, dataIndex, linkedOnlyIndex, projectRoutingValues } = request.body;
      const results: TestResults = {
        timestamp: new Date().toISOString(),
        environment: 'unknown',
        summary: {
          total: 0,
          passed: 0,
          failed: 0,
        },
        scenarios: [],
      };

      try {
        const coreContext = await context.core;
        const esClient = coreContext.elasticsearch.client.asInternalUser;

        // Test 1: System index searches with various project_routing values
        for (const projectRouting of projectRoutingValues) {
          const scenario = `System index search (${systemIndex}) with project_routing=${projectRouting}`;
          results.summary.total++;

          try {
            const searchResponse = await esClient.search({
              index: systemIndex,
              size: 0,
              query: { match_all: {} },
              body: {
                project_routing: projectRouting,
              },
            } as any);

            results.scenarios.push({
              scenario,
              success: true,
              statusCode: 200,
              details: {
                indexSearched: systemIndex,
                projectRouting,
                hitsCount: (searchResponse.hits.total as any)?.value ?? 0,
                message: 'Request succeeded - ES accepted project_routing for internal user',
              },
            });
            results.summary.passed++;
          } catch (error: any) {
            results.scenarios.push({
              scenario,
              success: false,
              statusCode: error.statusCode || 500,
              error: error.message,
              details: {
                indexSearched: systemIndex,
                projectRouting,
                message: 'Request failed - ES rejected project_routing for internal user',
              },
            });
            results.summary.failed++;
          }
        }

        // Test 2: Data index searches with various project_routing values
        for (const projectRouting of projectRoutingValues) {
          const scenario = `Data index search (${dataIndex}) with project_routing=${projectRouting}`;
          results.summary.total++;

          try {
            const searchResponse = await esClient.search({
              index: dataIndex,
              size: 0,
              allow_no_indices: true, // Allow empty indices for testing
              query: { match_all: {} },
              body: {
                project_routing: projectRouting,
              },
            } as any);

            results.scenarios.push({
              scenario,
              success: true,
              statusCode: 200,
              details: {
                indexSearched: dataIndex,
                projectRouting,
                hitsCount: (searchResponse.hits.total as any)?.value ?? 0,
                message: 'Request succeeded - ES accepted project_routing for internal user',
              },
            });
            results.summary.passed++;
          } catch (error: any) {
            results.scenarios.push({
              scenario,
              success: false,
              statusCode: error.statusCode || 500,
              error: error.message,
              details: {
                indexSearched: dataIndex,
                projectRouting,
                message: 'Request failed - ES rejected project_routing for internal user',
              },
            });
            results.summary.failed++;
          }
        }

        // Test 3: Verify routing behavior - query linked-only index
        // This test confirms internal user CANNOT access linked project data
        // even when project_routing explicitly points to linked project
        if (linkedOnlyIndex) {
          for (const projectRouting of projectRoutingValues) {
            // Skip _alias:_origin since that's expected to fail
            if (projectRouting === '_alias:_origin') {
              continue;
            }

            const scenario = `Linked-only index (${linkedOnlyIndex}) with project_routing=${projectRouting} - verify no access`;
            results.summary.total++;

            try {
              const searchResponse = await esClient.search({
                index: linkedOnlyIndex,
                size: 0,
                query: { match_all: {} },
                body: {
                  project_routing: projectRouting,
                },
              } as any);

              // If we get here with hits, that's UNEXPECTED - internal user shouldn't see linked data
              const hitsCount = (searchResponse.hits.total as any)?.value ?? 0;
              if (hitsCount > 0) {
                results.scenarios.push({
                  scenario,
                  success: false,
                  statusCode: 200,
                  error: 'UNEXPECTED: Internal user got data from linked project',
                  details: {
                    indexSearched: linkedOnlyIndex,
                    projectRouting,
                    hitsCount,
                    message: `FAIL: Got ${hitsCount} hits from linked-only index. Internal user should NOT access linked project data!`,
                  },
                });
                results.summary.failed++;
              } else {
                // 0 hits is acceptable (index exists but no matching docs in origin)
                results.scenarios.push({
                  scenario,
                  success: true,
                  statusCode: 200,
                  details: {
                    indexSearched: linkedOnlyIndex,
                    projectRouting,
                    hitsCount: 0,
                    message: 'PASS: 0 hits (internal user correctly limited to origin)',
                  },
                });
                results.summary.passed++;
              }
            } catch (error: any) {
              // "index not found" is the EXPECTED behavior - proves we're hitting origin only
              if (error.message?.includes('index_not_found') || error.statusCode === 404) {
                results.scenarios.push({
                  scenario,
                  success: true,
                  statusCode: 404,
                  details: {
                    indexSearched: linkedOnlyIndex,
                    projectRouting,
                    message:
                      'PASS: Index not found (proves internal user routed to origin, not linked)',
                  },
                });
                results.summary.passed++;
              } else {
                // Any other error is unexpected
                results.scenarios.push({
                  scenario,
                  success: false,
                  statusCode: error.statusCode || 500,
                  error: error.message,
                  details: {
                    indexSearched: linkedOnlyIndex,
                    projectRouting,
                    message: `FAIL: Unexpected error: ${error.message}`,
                  },
                });
                results.summary.failed++;
              }
            }
          }
        }

        return response.ok({
          body: results,
        });
      } catch (error: any) {
        return response.customError({
          statusCode: 500,
          body: {
            message: `Failed to run CPS tests: ${error.message}`,
            attributes: {
              error: error.stack,
            },
          },
        });
      }
    }
  );

  /**
   * Single scenario test endpoint - for targeted testing
   *
   * Usage:
   * ```
   * fetch('/internal/cps_test/run_scenario', {
   *   method: 'POST',
   *   headers: {
   *     'kbn-xsrf': 'true',
   *     'Content-Type': 'application/json'
   *   },
   *   body: JSON.stringify({
   *     index: '.kibana',
   *     projectRouting: 'your-linked-project-alias'
   *   })
   * }).then(r => r.json()).then(console.log)
   * ```
   *
   * Example with actual project alias:
   * ```
   * fetch('/internal/cps_test/run_scenario', {
   *   method: 'POST',
   *   headers: {
   *     'kbn-xsrf': 'true',
   *     'Content-Type': 'application/json'
   *   },
   *   body: JSON.stringify({
   *     index: 'kibana_sample_data_flights',
   *     projectRouting: 'keepbriando-cps-test-proj-linked-ce713c'
   *   })
   * }).then(r => r.json()).then(console.log)
   * ```
   */
  router.post(
    {
      path: '/internal/cps_test/run_scenario',
      validate: {
        body: schema.object({
          index: schema.string(),
          projectRouting: schema.string(),
          query: schema.maybe(schema.any()),
        }),
      },
      options: {
        authRequired: true,
        access: 'internal',
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This is a test endpoint for CPS validation',
        },
      },
    },
    async (context, request, response) => {
      const { index, projectRouting, query = { match_all: {} } } = request.body;

      try {
        const coreContext = await context.core;
        const esClient = coreContext.elasticsearch.client.asInternalUser;

        const searchResponse = await esClient.search({
          index,
          size: 0,
          allow_no_indices: true,
          query,
          body: {
            project_routing: projectRouting,
          },
        } as any);

        return response.ok({
          body: {
            success: true,
            index,
            projectRouting,
            hitsCount: (searchResponse.hits.total as any)?.value ?? 0,
            message: 'Search completed successfully',
          },
        });
      } catch (error: any) {
        return response.customError({
          statusCode: error.statusCode || 500,
          body: {
            message: error.message,
            attributes: {
              success: false,
              index,
              projectRouting,
              details: error.meta?.body || error.stack,
            },
          },
        });
      }
    }
  );

  /**
   * Health check endpoint
   */
  router.get(
    {
      path: '/internal/cps_test/health',
      validate: false,
      options: {
        authRequired: false,
        access: 'internal',
      },
      security: {
        authz: {
          enabled: false,
          reason: 'Health check endpoint',
        },
      },
    },
    async (context, request, response) => {
      return response.ok({
        body: {
          status: 'ok',
          message: 'CPS Test Endpoints plugin is running',
          timestamp: new Date().toISOString(),
        },
      });
    }
  );
}
