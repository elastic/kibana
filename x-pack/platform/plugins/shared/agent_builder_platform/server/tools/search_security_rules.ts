/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isArray, isObject, pick } from 'lodash';
import { z } from '@kbn/zod';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { RulesClient, Rule } from '@kbn/alerting-plugin/server';
import type { CoreSetup, KibanaRequest } from '@kbn/core/server';
import type { AgentBuilderPlatformPluginStart, PluginStartDependencies } from '../types';
import { enrichFilterWithRuleTypeMapping } from './search_security_rules_tools/enrich_filter_with_rule_type_mappings';

const searchSecurityRulesSchema = z.object({
  name: z.string().optional().describe('Filter by rule name. Wildcards are supported.'),
  description: z
    .string()
    .optional()
    .describe('Filter by rule description. Wildcards are supported.'),
  ruleType: z
    .string()
    .optional()
    .describe(
      'Filter by the type of rule, e.g. "query", "threat_match", "new_terms", etc. This refers to `params.type`.'
    ),
  isPrebuilt: z
    .boolean()
    .optional()
    .describe('Filter for prebuilt (true) or custom (false) rules.'),
  riskScoreGte: z
    .number()
    .optional()
    .describe('Filter for rules with a risk score greater than or equal to this value.'),
  riskScoreLte: z
    .number()
    .optional()
    .describe('Filter for rules with a risk score less than or equal to this value.'),
  severity: z
    .array(z.string())
    .optional()
    .describe('Filter by an array of severity levels, e.g. ["low", "medium", "high", "critical"].'),
  tags: z.array(z.string()).optional().describe('Filter by an array of tags.'),
  enabled: z.boolean().optional().describe('Filter by whether the rule is enabled or not.'),
  size: z
    .number()
    .optional()
    .default(10)
    .describe('Maximum number of rules to return. Defaults to 10.'),
});

const EXPOSED_RULE_FIELDS = [
  'id',
  'ruleId',
  'name',
  'description',
  'type',
  'riskScore',
  'riskScoreMapping',
  'severity',
  'severityMapping',
  'threat',
  'to',
  'references',
  'version',
  'revision',
  'exceptionsList',
  'relatedIntegrations',
  'requiredFields',
  'language',
  'index',
  'query',
  'filters',
  'tags',
  'enabled',
];

export const searchSecurityRulesTool = (
  coreSetup: CoreSetup<PluginStartDependencies, AgentBuilderPlatformPluginStart>
): BuiltinToolDefinition<typeof searchSecurityRulesSchema> => {
  const getRulesClient = async (request: KibanaRequest): Promise<RulesClient> => {
    const [, plugins] = await coreSetup.getStartServices();

    return plugins.alerting.getRulesClientWithRequest(request);
  };

  return {
    id: platformCoreTools.searchSecurityRules,
    type: ToolType.builtin,
    description: 'Search for security rules.',
    schema: searchSecurityRulesSchema,
    handler: async (args, { request, logger }) => {
      try {
        const { size, ...params } = args;
        const kqlFilters: string[] = [];

        if (params.name) {
          kqlFilters.push(`alert.attributes.name: "*${params.name}*"`);
        }
        if (params.description) {
          kqlFilters.push(`alert.attributes.params.description: "*${params.description}*"`);
        }
        if (params.ruleType) {
          kqlFilters.push(`alert.attributes.params.type: ${params.ruleType}`);
        }
        if (params.isPrebuilt === true) {
          kqlFilters.push(`alert.attributes.params.ruleId: *`);
        } else if (params.isPrebuilt === false) {
          kqlFilters.push(`not alert.attributes.params.ruleId: *`);
        }
        if (params.riskScoreGte !== undefined) {
          kqlFilters.push(`alert.attributes.params.riskScore >= ${params.riskScoreGte}`);
        }
        if (params.riskScoreLte !== undefined) {
          kqlFilters.push(`alert.attributes.params.riskScore <= ${params.riskScoreLte}`);
        }
        if (params.severity && params.severity.length > 0) {
          const severityClause = params.severity.map((s) => `"${s}"`).join(' or ');
          kqlFilters.push(`alert.attributes.params.severity: (${severityClause})`);
        }
        if (params.tags && params.tags.length > 0) {
          const tagsClause = params.tags.map((t) => `"${t}"`).join(' or ');
          kqlFilters.push(`alert.attributes.tags: (${tagsClause})`);
        }
        if (params.enabled !== undefined) {
          kqlFilters.push(`alert.attributes.enabled: ${params.enabled}`);
        }

        const filter = kqlFilters.join(' and ');
        const rulesClient = await getRulesClient(request);
        const rules = await rulesClient.find({
          options: {
            perPage: size,
            filter: enrichFilterWithRuleTypeMapping(filter),
          },
        });

        const columns = EXPOSED_RULE_FIELDS.map((field) => {
          let type: 'string' | 'number' | 'boolean' = 'string';
          if (field === 'enabled') {
            type = 'boolean';
          } else if (['params.riskScore', 'params.version', 'params.revision'].includes(field)) {
            type = 'number';
          }
          return { name: field, type };
        });

        return {
          results: [
            {
              type: ToolResultType.tabularData,
              data: {
                query: filter,
                columns,
                values: rules.data.map((rule) => {
                  const flatRule = flattenRule(rule as Rule);
                  const picked = pick(flatRule, EXPOSED_RULE_FIELDS);
                  // stringify object/array values
                  for (const key in picked) {
                    if (typeof picked[key] === 'object' && picked[key] !== null) {
                      picked[key] = JSON.stringify(picked[key]);
                    }
                  }
                  return picked;
                }),
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error searching security rules: ${error.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: { message: `Failed to search security rules: ${error.message}` },
            },
          ],
        };
      }
    },
    tags: [],
  };
};

function flattenRule(
  obj: Record<string, unknown>,
  result: Record<string, unknown> = {}
): Record<string, unknown> {
  for (const [key, value] of Object.entries(obj)) {
    if (isObject(value) && !isArray(value) && value !== null) {
      flattenRule(value as Record<string, unknown>, result);
    } else {
      result[key] = obj[key];
    }
  }

  return result;
}
