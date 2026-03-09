/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Evaluator } from '../../types';
import { createTraceBasedEvaluator } from './factory';

export function createSkillInvocationEvaluator({
  traceEsClient,
  log,
  skillName,
}: {
  traceEsClient: EsClient;
  log: ToolingLog;
  skillName: string;
}): Evaluator {
  return createTraceBasedEvaluator({
    traceEsClient,
    log,
    config: {
      name: `Skill Invoked (${skillName})`,
      buildQuery: (traceId) => `FROM traces-*
| WHERE trace.id == "${traceId}"
  AND attributes.elastic.inference.span.kind == "TOOL"
  AND attributes.gen_ai.tool.name == "filestore.read"
  AND attributes.elastic.tool.parameters LIKE "*/${skillName}/SKILL.md*"
| STATS skill_invoked = COUNT(*)`,
      extractResult: (response) => {
        const count = response.values[0]?.[0] as number;
        return count > 0 ? 1 : 0;
      },
      isResultValid: (result) => result !== null,
    },
  });
}
