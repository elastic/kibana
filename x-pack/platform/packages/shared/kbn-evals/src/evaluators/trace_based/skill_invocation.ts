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

export function buildSkillInvokedCaseExpression(skillName: string): string {
  return `(
      attributes.gen_ai.tool.name == "filestore.read"
        AND attributes.gen_ai.tool.call.arguments LIKE "*/${skillName}/SKILL.md*"
    ) OR (
      attributes.gen_ai.tool.name == "load_skill"
        AND (
          attributes.gen_ai.tool.call.arguments LIKE "*\\"skill\\":\\"${skillName}\\"*"
          OR attributes.gen_ai.tool.call.arguments LIKE "*\\"skill\\": \\"${skillName}\\"*"
          OR attributes.gen_ai.tool.call.arguments LIKE "*/${skillName}/SKILL.md*"
        )
    )`;
}

export interface ExampleScopedSkillInvocationContext {
  expectedSkill?: string;
  shouldNotActivateSkill?: string;
}

export function createExampleScopedSkillInvocationEvaluator({
  traceEsClient,
  log,
  skillName,
  resolveContext,
}: {
  traceEsClient: EsClient;
  log: ToolingLog;
  skillName: string;
  resolveContext: (args: {
    metadata?: Record<string, unknown>;
    expected?: unknown;
  }) => ExampleScopedSkillInvocationContext;
}): Evaluator {
  const inner = createSkillInvocationEvaluator({ traceEsClient, log, skillName });

  return {
    ...inner,
    evaluate: async (args) => {
      const { expectedSkill, shouldNotActivateSkill } = resolveContext(args);

      if (shouldNotActivateSkill === skillName) {
        const result = await inner.evaluate(args);
        if (result.score == null) {
          return result;
        }
        const invoked = result.score === 1;
        return {
          ...result,
          score: invoked ? 0 : 1,
          explanation: invoked
            ? `Skill ${skillName} was invoked for a distractor prompt.`
            : `Skill ${skillName} correctly not invoked for distractor.`,
        };
      }

      if (expectedSkill && expectedSkill !== skillName) {
        return {
          score: null,
          label: 'N/A',
          explanation: `Example targets skill ${expectedSkill}, not ${skillName}.`,
        };
      }

      if (!expectedSkill && shouldNotActivateSkill && shouldNotActivateSkill !== skillName) {
        return {
          score: null,
          label: 'N/A',
          explanation: 'Skill invocation not scored for this example.',
        };
      }

      return inner.evaluate(args);
    },
  };
}

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
      ${buildSkillInvokedCaseExpression(skillName)},
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
