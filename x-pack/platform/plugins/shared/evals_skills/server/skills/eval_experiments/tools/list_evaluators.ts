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
 * Lists the registered evaluators, including whether each one is LLM-backed
 * (and therefore needs a judge connector).
 */
export const listEvaluatorsTool = (
  deps: EvalExperimentsToolDeps
): BuiltinSkillBoundedTool<typeof schema> => ({
  id: evalsTools.listEvaluators,
  type: ToolType.builtin,
  description:
    'List the evaluators available in this space (name, version, kind, origin, description), both built-in and user-defined. `llm` evaluators require a judge connector_id (needsJudgeConnector=true); `code` evaluators do not.',
  schema,
  handler: async (_args, { request, spaceId }) => {
    try {
      const { evals, security } = await deps.getStartDependencies();
      if (!(await hasReadEvalsPrivilege({ security, request, spaceId }))) {
        return errorResult(
          'You do not have the read_evals privilege required to list evaluators in this space.'
        );
      }
      if (!evals.listEvaluators) {
        return toErrorResult(
          new Error('the evals evaluator registry is unavailable'),
          'Failed to list evaluators'
        );
      }

      const evaluators = await evals.listEvaluators({ spaceId });
      return otherResult({ total: evaluators.length, evaluators });
    } catch (error) {
      return toErrorResult(error, 'Failed to list evaluators');
    }
  },
});
