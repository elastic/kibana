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

const VALID_SKILL_NAME = /^[a-zA-Z0-9_-]+$/;

/**
 * Tool call arguments are recorded as compact JSON of the tool's parameters — e.g.
 * `{"skill":"detection-rule-edit"}` for `load_skill` (its only parameter is `skill`) or
 * `{"path":"/skills/security/threat-hunting/SKILL.md"}` for `filestore.read`/`read_file`.
 * The `load_skill` branch therefore anchors the *value* of `skill` (the delimited JSON value
 * `"skill":"<name>"`) instead of matching the name as a bare substring, which also matched a
 * different skill whose name merely contains it (`detection-rule-edit-v2`), scoring a
 * successful invocation for a skill that was never loaded. The value forms `load_skill`
 * documents — the bare name, the skill's folder path, or the SKILL.md path — are matched on
 * their own delimiters (the delimited name value, a value ending in `/<name>`, or a path
 * ending in `/<name>/SKILL.md`), so a neighbouring folder such as `detection-rule-edit-v2`
 * matches none of them.
 * The file-read branch covers `read_file` (current id) as well as `filestore.read` (legacy id):
 * a SKILL.md read through either id is the same load, and the eval suite's trajectory filter
 * treats both as one.
 */
export function createSkillInvocationEvaluator({
  traceEsClient,
  log,
  skillName,
}: {
  traceEsClient: EsClient;
  log: ToolingLog;
  skillName: string;
}): Evaluator {
  if (!VALID_SKILL_NAME.test(skillName)) {
    throw new Error(
      `Invalid skillName: "${skillName}" - only alphanumeric characters, hyphens, and underscores are allowed`
    );
  }

  return createTraceBasedEvaluator({
    traceEsClient,
    log,
    config: {
      name: `Skill Invoked (${skillName})`,
      buildQuery: (traceId) => `FROM traces-*
| WHERE trace.id == "${traceId}"
| STATS
  total_spans = COUNT(*),
  agent_spans = COUNT(
    CASE(
      attributes.elastic.inference.span.kind == "AGENT",
      1,
      NULL
    )
  ),
  total_tool_spans = COUNT(
    CASE(
      attributes.elastic.inference.span.kind == "TOOL",
      1,
      NULL
    )
  ),
  skill_invoked = COUNT(
    CASE(
      (
        attributes.gen_ai.tool.name == "load_skill"
          AND (
            attributes.gen_ai.tool.call.arguments LIKE "*\\"skill\\":\\"${skillName}\\"*"
            OR attributes.gen_ai.tool.call.arguments LIKE "*\\"skill\\":\\"*/${skillName}\\"*"
            OR attributes.gen_ai.tool.call.arguments LIKE "*/${skillName}/SKILL.md*"
          )
      )
      OR
      (
        (
          attributes.gen_ai.tool.name == "filestore.read"
          OR attributes.gen_ai.tool.name == "read_file"
        )
          AND attributes.gen_ai.tool.call.arguments LIKE "*/${skillName}/SKILL.md*"
      ),
      1,
      NULL
    )
  )`,
      extractResult: (response) => {
        const row = response.values[0];
        const totalSpansIndex = response.columns.findIndex(
          (column) => column.name === 'total_spans'
        );
        const agentSpansIndex = response.columns.findIndex(
          (column) => column.name === 'agent_spans'
        );
        const totalToolSpansIndex = response.columns.findIndex(
          (column) => column.name === 'total_tool_spans'
        );
        const skillInvokedIndex = response.columns.findIndex(
          (column) => column.name === 'skill_invoked'
        );

        if (
          totalSpansIndex === -1 ||
          agentSpansIndex === -1 ||
          totalToolSpansIndex === -1 ||
          skillInvokedIndex === -1
        ) {
          log.warning('Expected columns not found in trace query response');
          return null;
        }

        const totalSpans = row?.[totalSpansIndex] as number | undefined;
        const agentSpans = row?.[agentSpansIndex] as number | undefined;
        const totalToolSpans = row?.[totalToolSpansIndex] as number | undefined;
        const skillInvoked = row?.[skillInvokedIndex] as number | undefined;

        if (!totalSpans) {
          return null;
        }

        // The run's root span (`kind: AGENT`) is exported last, so its absence means the trace is
        // still being indexed. Returning 0 here would be a permanent false failure: 0 is a valid
        // score, so the shared retry loop would stop on a trace whose tool spans have not arrived.
        if (!agentSpans) {
          return null;
        }

        if (!totalToolSpans) {
          return 0;
        }

        return (skillInvoked ?? 0) > 0 ? 1 : 0;
      },
      isResultValid: (result) => result !== null,
    },
  });
}
