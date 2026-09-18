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
 * The `load_skill` branch therefore anchors the *value* of `skill` (`\"skill\":\"<name>\"`)
 * instead of matching the name as a bare substring, which also matched a different skill whose
 * name merely contains it (`detection-rule-edit-v2`), scoring a successful invocation for a
 * skill that was never loaded. The path form stays anchored on `<name>/SKILL.md` for both
 * tools, since `load_skill` accepts a folder path or a SKILL.md path as well as the name.
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
        const totalToolSpansIndex = response.columns.findIndex(
          (column) => column.name === 'total_tool_spans'
        );
        const skillInvokedIndex = response.columns.findIndex(
          (column) => column.name === 'skill_invoked'
        );

        if (totalSpansIndex === -1 || totalToolSpansIndex === -1 || skillInvokedIndex === -1) {
          log.warning('Expected columns not found in trace query response');
          return null;
        }

        const totalSpans = row?.[totalSpansIndex] as number | undefined;
        const totalToolSpans = row?.[totalToolSpansIndex] as number | undefined;
        const skillInvoked = row?.[skillInvokedIndex] as number | undefined;

        if (!totalSpans) {
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
