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
| STATS
  total_tool_spans = COUNT(*),
  skill_invoked = COUNT(
    CASE(
      attributes.gen_ai.tool.name == "filestore.read"
        AND attributes.elastic.tool.parameters LIKE "*/${skillName}/SKILL.md*",
      1,
      NULL
    )
  )`,
      extractResult: (response) => {
        const row = response.values[0];
        const totalToolSpansIndex = response.columns.findIndex(
          (column) => column.name === 'total_tool_spans'
        );
        const skillInvokedIndex = response.columns.findIndex(
          (column) => column.name === 'skill_invoked'
        );
        const totalToolSpans = row?.[totalToolSpansIndex] as number | undefined;
        const skillInvoked = row?.[skillInvokedIndex] as number | undefined;

        if (!totalToolSpans) {
          return null;
        }

        return skillInvoked && skillInvoked > 0 ? 1 : 0;
      },
      isResultValid: (result) => result !== null,
    },
  });
}
