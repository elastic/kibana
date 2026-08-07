/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';

/**
 * Tool id whose results carry a generated visualization. `create_visualization`
 * emits a `{ type: 'visualization', data: { esql, renderer, chart_type,
 * visualization, attachment_id } }` payload. Unlike the analytical ES|QL
 * suites, the query the model produced is not surfaced as a `generate_esql`
 * step — it is embedded in the visualization result's `data.esql`, so this is
 * the only reliable extraction path.
 */
const CREATE_VISUALIZATION_TOOL_ID = platformCoreTools.createVisualization;
const VISUALIZATION_RESULT_TYPE = 'visualization';

/**
 * Agent Builder converse steps are passed through opaquely: only their shared
 * `type` / `tool_id` / `results` fields are inspected, so a loose
 * `Record<string, unknown>` keeps the extractor resilient to additive changes
 * in the step union and avoids modelling it here.
 */
interface ConverseLikeOutput {
  steps?: Array<Record<string, unknown>>;
}

/**
 * Minimal view of a `create_visualization` tool result payload
 * (`VisualizationResultData` in `@kbn/agent-builder-common`). Kept local and
 * loose so the extractor stays resilient to additive changes in the tool
 * result shape.
 */
export interface ExtractedVisualization {
  esql?: string;
  renderer?: 'lens' | 'vega';
  chart_type?: string;
  attachment_id?: string;
  visualization?: Record<string, unknown>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Collect every `create_visualization` visualization result from an Agent
 * Builder `converse` response, in call order. Error results (a failed
 * generation) are intentionally NOT included: they carry no `esql`, so the
 * downstream execution/validity evaluators score the empty extraction as a
 * failure — which is the correct signal for a broken generation.
 */
export function extractVisualizationResults(output: ConverseLikeOutput): ExtractedVisualization[] {
  const steps = output?.steps ?? [];
  const visualizations: ExtractedVisualization[] = [];

  for (const step of steps) {
    if (
      step.type === 'tool_call' &&
      step.tool_id === CREATE_VISUALIZATION_TOOL_ID &&
      Array.isArray(step.results)
    ) {
      for (const candidate of step.results) {
        if (
          isRecord(candidate) &&
          candidate.type === VISUALIZATION_RESULT_TYPE &&
          isRecord(candidate.data)
        ) {
          visualizations.push(candidate.data as ExtractedVisualization);
        }
      }
    }
  }

  return visualizations;
}

/**
 * Extract the ES|QL strings backing every generated visualization. Returns an
 * empty array when the agent produced no renderable visualization, which the
 * validity/execution evaluators treat according to their `scoreOnEmptyQueries`
 * policy.
 */
export function extractVisualizationEsql(output: ConverseLikeOutput): string[] {
  return extractVisualizationResults(output)
    .map((visualization) => visualization.esql)
    .filter((esql): esql is string => typeof esql === 'string' && esql.trim().length > 0);
}

/**
 * Ordered list of tool ids invoked across the converse turn. Feeds the
 * trajectory evaluator's golden-tool-path comparison.
 */
export function getToolIds(output: ConverseLikeOutput): string[] {
  const steps = output?.steps ?? [];
  return steps
    .filter((step) => step.type === 'tool_call')
    .map((step) => (typeof step.tool_id === 'string' ? step.tool_id : ''))
    .filter(Boolean);
}

/**
 * Skill paths / ids surfaced by `load_skill` tool calls, used to check which
 * skill the agent routed the request to.
 */
export function getSkillReadPaths(output: ConverseLikeOutput): string[] {
  const steps = output?.steps ?? [];
  const paths: string[] = [];

  for (const step of steps) {
    if (step.type !== 'tool_call' || step.tool_id !== 'load_skill') {
      continue;
    }

    const params = step.params as { skill?: string } | undefined;
    if (params?.skill) {
      paths.push(params.skill);
    }

    const results = Array.isArray(step.results) ? step.results : [];
    for (const result of results) {
      const data = (result as { data?: { skill?: { path?: string; id?: string; name?: string } } })
        .data;
      if (data?.skill?.path) {
        paths.push(data.skill.path);
      }
      if (data?.skill?.id) {
        paths.push(data.skill.id);
      }
      if (data?.skill?.name) {
        paths.push(data.skill.name);
      }
    }
  }

  return paths.filter(Boolean);
}
