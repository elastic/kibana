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

const FILESTORE_READ_TOOL = 'filestore.read';
const LOAD_SKILL_TOOL = 'load_skill';

/**
 * Patterns (raw, before ES|QL string escaping) that match a tool call's JSON arguments.
 * `skillName` must already be validated against VALID_SKILL_NAME.
 */
export const getSkillInvocationPatterns = (skillName: string) => ({
  // LIKE pattern for a filestore.read of the skill's SKILL.md
  filestoreRead: `*/${skillName}/SKILL.md*`,
  // RLIKE (whole-string) pattern for load_skill, which accepts a name, a folder path or a
  // SKILL.md path. Mirrors resolveSkill: surrounding whitespace is trimmed, a trailing
  // `/SKILL.md` is dropped and a leading `/` is optional. The quote, slash and space boundaries
  // keep `foo` from matching `foo-bar` or `my-foo`.
  loadSkill: `.*[\\" /]${skillName}(/SKILL\\.md)?[\\" ].*`,
});

const toEsqlStringLiteral = (value: string): string =>
  `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

const buildSkillInvokedCondition = (skillName: string): string => {
  const { filestoreRead, loadSkill } = getSkillInvocationPatterns(skillName);
  const args = 'attributes.gen_ai.tool.call.arguments';

  return `(
        attributes.gen_ai.tool.name == "${FILESTORE_READ_TOOL}"
          AND ${args} LIKE ${toEsqlStringLiteral(filestoreRead)}
      )
      OR (
        attributes.gen_ai.tool.name == "${LOAD_SKILL_TOOL}"
          AND ${args} RLIKE ${toEsqlStringLiteral(loadSkill)}
      )`;
};

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
      direction: 'maximize',
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
      ${buildSkillInvokedCondition(skillName)},
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
