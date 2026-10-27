/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { ALERTING_TOOL_IDS, MAX_TAG_LENGTH, MAX_TAGS } from '@kbn/alerting-v2-constants';
import type { RuleTemplateResponse } from '@kbn/alerting-v2-schemas';
import {
  MAX_SEARCH_LENGTH,
  RULE_TEMPLATE_MAX_PER_PAGE,
  getRootEsqlQuery,
  ruleKindSchema,
} from '@kbn/alerting-v2-schemas';
import { deriveTemplateSource, type TemplateSource } from '../../common/derive_template_source';
import { ensureToolPrivilege } from '../../common/unauthorized_tool_result';
import { ALERTING_LOG_CODES } from '../../../lib/errors/error_codes';
import type { RuleTemplatesClient } from '../../../lib/rule_templates_client';
import type { LoggerServiceContract } from '../../../lib/services/logger_service/logger_service';
import type { PrivilegeChecker } from '../../../lib/services/privilege_checker/privilege_checker';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;
const QUERY_PREVIEW_LENGTH = 300;
const MAX_FILTER_LENGTH = 128;

const findRuleTemplatesSchema = lazySchema(() =>
  z.object({
    search: z
      .string()
      .trim()
      .min(1)
      .max(MAX_SEARCH_LENGTH)
      .optional()
      .describe('(optional) Free text matched against template names and descriptions.'),
    integration: z
      .string()
      .trim()
      .min(1)
      .max(MAX_FILTER_LENGTH)
      .optional()
      .describe(
        '(optional) Integration or technology name, e.g. "nginx", "kubernetes", "system". Matches the integration derived from the template query or a template tag.'
      ),
    dataset: z
      .string()
      .trim()
      .min(1)
      .max(MAX_FILTER_LENGTH)
      .optional()
      .describe(
        '(optional) Exact data stream dataset, e.g. "nginx.access" or "system.cpu". Matches templates whose query reads that dataset.'
      ),
    tags: z
      .array(z.string().min(1).max(MAX_TAG_LENGTH))
      .max(MAX_TAGS)
      .optional()
      .describe('(optional) Only return templates carrying at least one of these tags.'),
    kind: ruleKindSchema
      .optional()
      .describe('(optional) Only return `alert` or `signal` templates.'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_LIMIT)
      .optional()
      .describe(`(optional) Maximum templates to return. Defaults to ${DEFAULT_LIMIT}.`),
  })
);

type FindRuleTemplatesInput = z.infer<typeof findRuleTemplatesSchema>;

export interface FindRuleTemplatesToolDeps {
  logger: LoggerServiceContract;
  getRuleTemplatesClient: (request: KibanaRequest) => RuleTemplatesClient;
  getPrivilegeChecker: (request: KibanaRequest) => PrivilegeChecker;
}

interface TemplateWithSource {
  template: RuleTemplateResponse;
  source: TemplateSource;
}

const truncate = (value: string, max: number): string =>
  value.length > max ? `${value.slice(0, max)}…` : value;

const matchesFilters = (
  { template, source }: TemplateWithSource,
  { integration, dataset, kind }: FindRuleTemplatesInput
): boolean => {
  if (kind && template.rule.kind !== kind) {
    return false;
  }
  if (integration) {
    const wanted = integration.toLowerCase();
    const tags = (template.rule.metadata.tags ?? []).map((tag) => tag.toLowerCase());
    if (source.integration?.toLowerCase() !== wanted && !tags.includes(wanted)) {
      return false;
    }
  }
  if (dataset) {
    const wanted = dataset.toLowerCase();
    if (!source.data_streams.some((stream) => stream.dataset.toLowerCase() === wanted)) {
      return false;
    }
  }
  return true;
};

/**
 * Resolves the template's sources against the cluster. Returns `undefined`
 * when the lookup fails so the caller omits the field instead of guessing.
 */
const hasDataForSources = async (
  esClient: IScopedClusterClient,
  indexPatterns: string[]
): Promise<boolean | undefined> => {
  if (indexPatterns.length === 0) {
    return undefined;
  }
  try {
    const response = await esClient.asCurrentUser.indices.resolveIndex({
      name: indexPatterns,
      expand_wildcards: 'open',
      ignore_unavailable: true,
      allow_no_indices: true,
    });
    return (
      response.indices.length > 0 || response.data_streams.length > 0 || response.aliases.length > 0
    );
  } catch {
    return undefined;
  }
};

const summarizeTemplate = (
  { template, source }: TemplateWithSource,
  hasData: boolean | undefined
) => {
  const { rule } = template;
  return {
    id: template.id,
    name: rule.metadata.name,
    ...(rule.metadata.description ? { description: rule.metadata.description } : {}),
    kind: rule.kind,
    ...(rule.metadata.tags?.length ? { tags: rule.metadata.tags } : {}),
    ...(source.integration ? { integration: source.integration } : {}),
    index_patterns: source.index_patterns,
    data_streams: source.data_streams,
    ...(hasData !== undefined ? { has_data: hasData } : {}),
    query: {
      base: truncate(rule.query.base, QUERY_PREVIEW_LENGTH),
      ...(rule.query.breach ? { breach: rule.query.breach } : {}),
    },
    ...(rule.grouping?.fields?.length ? { grouping_fields: rule.grouping.fields } : {}),
    schedule: rule.schedule,
    ...(template.rule_count !== undefined ? { rule_count: template.rule_count } : {}),
  };
};

export const findRuleTemplatesTool = ({
  logger,
  getRuleTemplatesClient,
  getPrivilegeChecker,
}: FindRuleTemplatesToolDeps): BuiltinSkillBoundedTool<typeof findRuleTemplatesSchema> => ({
  id: ALERTING_TOOL_IDS.findRuleTemplates,
  type: ToolType.builtin,
  description: `Find installed alerting V2 rule templates: prebuilt rules shipped by integrations (for example nginx, Kubernetes, system metrics).

Returns a compact summary per template: id, name, description, kind, integration, the data streams its query reads, whether that data exists in the cluster (\`has_data\`), the query, grouping, schedule, and how many rules already use it (\`rule_count\`).

This tool is read-only. To start a rule from a template, call ${ALERTING_TOOL_IDS.manageRule} with \`apply_template\` as the first operation.`,
  schema: findRuleTemplatesSchema,
  handler: async (input, { request, esClient, spaceId }) => {
    const unauthorized = await ensureToolPrivilege({
      privilegeChecker: getPrivilegeChecker(request),
      feature: 'rules',
      level: 'read',
      action: 'find rule templates',
    });
    if (unauthorized) {
      return unauthorized;
    }

    try {
      const { items } = await getRuleTemplatesClient(request).findRuleTemplates({
        search: input.search,
        tags: input.tags,
        perPage: RULE_TEMPLATE_MAX_PER_PAGE,
      });

      const matches = items
        .map((template) => ({
          template,
          source: deriveTemplateSource(getRootEsqlQuery(template.rule.query)),
        }))
        .filter((item) => matchesFilters(item, input));

      const limited = matches.slice(0, input.limit ?? DEFAULT_LIMIT);
      const hasData = await Promise.all(
        limited.map(({ source }) => hasDataForSources(esClient, source.index_patterns))
      );

      return {
        results: [
          {
            type: ToolResultType.other,
            tool_result_id: getToolResultId(),
            data: {
              total: matches.length,
              templates: limited.map((item, index) => summarizeTemplate(item, hasData[index])),
            },
          },
        ],
      };
    } catch (error) {
      logger.warn({
        message: 'Failed to find rule templates',
        code: ALERTING_LOG_CODES.AGENT_BUILDER_FIND_RULE_TEMPLATES_FAILED,
        labels: { space_id: spaceId },
        error,
      });
      const message = error instanceof Error ? error.message : String(error);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: `Failed to find rule templates: ${message}` },
          },
        ],
      };
    }
  },
});
