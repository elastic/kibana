/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import { createErrorResult } from '@kbn/onechat-server';

const correlationEngineSchema = z.object({
  results: z
    .record(z.unknown())
    .describe(
      'Aggregated results from all catchup tools (security, observability, search, external)'
    ),
});

export const correlationEngineTool = (): BuiltinToolDefinition<typeof correlationEngineSchema> => {
  return {
    id: 'platform.catchup.correlation.engine',
    type: ToolType.builtin,
    description: `Correlates events across Security, Observability, Search, and external sources by shared identifiers.
    
Accepts results from all catchup tools and finds relationships by:
- Alert IDs
- Case IDs
- PR links
- Service names
- Timestamps

Returns structured correlation data linking related events.`,
    schema: correlationEngineSchema,
    handler: async ({ results }, { logger }) => {
      try {
        logger.debug('correlation engine tool called');

        const correlations: Array<{
          alert?: string;
          case?: string;
          pr?: string;
          service?: string;
          github?: unknown[];
          slack?: unknown[];
          observability?: unknown;
        }> = [];

        // Extract data from results
        const securityData = results.security_summary || {};
        const observabilityData = results.observability || {};
        const searchData = results.search || {};
        const externalData = results.external || {};

        // Simple correlation logic - match by service names, alert IDs, case IDs
        const alerts = observabilityData.top_services || [];
        const cases = securityData.cases?.values || [];
        const githubPRs = externalData.github?.pull_requests || [];

        // Correlate alerts with services mentioned in GitHub PRs
        for (const alert of alerts) {
          const serviceName = alert.service?.name || alert.service;
          if (serviceName) {
            const linkedPRs = githubPRs.filter((pr: any) => {
              const prTitle = pr.title?.toLowerCase() || '';
              const prBody = pr.body?.toLowerCase() || '';
              return (
                prTitle.includes(serviceName.toLowerCase()) ||
                prBody.includes(serviceName.toLowerCase())
              );
            });

            if (linkedPRs.length > 0) {
              correlations.push({
                alert: alert.id || alert.alert_id,
                service: serviceName,
                github: linkedPRs,
              });
            }
          }
        }

        // Correlate cases with alerts
        for (const caseItem of cases) {
          const caseId = caseItem.id || caseItem.case_id;
          if (caseId) {
            correlations.push({
              case: caseId,
              alert: caseItem.related_alerts?.[0] || null,
            });
          }
        }

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                correlations,
                total_correlations: correlations.length,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error in correlation engine tool: ${error}`);
        return {
          results: [createErrorResult(`Error correlating events: ${error}`)],
        };
      }
    },
    tags: ['correlation', 'orchestrator'],
  };
};
