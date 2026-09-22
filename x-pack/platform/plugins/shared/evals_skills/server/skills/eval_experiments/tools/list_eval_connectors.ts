/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { errorResult, evalsTools, otherResult, toErrorResult } from './common';
import { hasReadEvalsPrivilege } from './check_privileges';
import type { EvalExperimentsToolDeps } from './deps';

const schema = z.object({});

/**
 * Lists genAI/model connectors so the agent can resolve a mentioned model name to its connector
 * id, for both the model under evaluation (`connector_ids`) and llm judges (`connector_id`).
 */
export const listConnectorsTool = (
  deps: EvalExperimentsToolDeps
): BuiltinSkillBoundedTool<typeof schema> => ({
  id: evalsTools.listConnectors,
  type: ToolType.builtin,
  description:
    'List available model connectors (id, name, type). Use this to resolve a model name the user mentioned to its connector id, for both the model under evaluation (connector_ids) and any llm evaluator judge (connector_id). Never guess connector ids or query system indices.',
  schema,
  handler: async (_input, { request, spaceId }) => {
    try {
      const { evals, security } = await deps.getStartDependencies();
      if (!(await hasReadEvalsPrivilege({ security, request, spaceId }))) {
        return errorResult(
          'You do not have the read_evals privilege required to list model connectors in this space.'
        );
      }

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
