/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { evalsTools, otherResult, toErrorResult } from './common';
import type { EvalExperimentsToolDeps } from './deps';

const schema = z.object({});

/**
 * Lists the genAI/model connectors so the agent can resolve a model name the user
 * mentioned to its connector id, for both the model under evaluation
 * (`connector_ids`) and llm evaluator judges (`connector_id`).
 */
export const listConnectorsTool = (
  deps: EvalExperimentsToolDeps
): BuiltinSkillBoundedTool<typeof schema> => ({
  id: evalsTools.listConnectors,
  type: ToolType.builtin,
  description:
    'List available model connectors (id, name, type). Use this to resolve a model name the user mentioned to its connector id, for both the model under evaluation (connector_ids) and any llm evaluator judge (connector_id). Never guess connector ids or query system indices.',
  schema,
  handler: async (_input, { request }) => {
    try {
      const { evals } = await deps.getStartDependencies();
      if (!evals.listModelConnectors) {
        return toErrorResult(
          new Error('the evals connector listing is unavailable'),
          'Failed to list connectors'
        );
      }

      const connectors = await evals.listModelConnectors(request);
      return otherResult({ total: connectors.length, connectors });
    } catch (error) {
      return toErrorResult(error, 'Failed to list connectors');
    }
  },
});
