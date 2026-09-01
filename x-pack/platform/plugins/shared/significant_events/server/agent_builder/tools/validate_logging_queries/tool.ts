/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_ID_LENGTH, MAX_TEXT_LENGTH } from '@kbn/significant-events-schema';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import dedent from 'dedent';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import type { GetScopedClients } from '../../../routes/types';
import { SIGNIFICANT_EVENTS_LOGGING_QUERIES_VALIDATE_TOOL_ID } from '../tool_ids';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import { validateLoggingQueriesHandler, type ValidateLoggingQueriesOutput } from './handler';
import { getCodeboxClient } from '../../../lib/knowledge_indicators/code_intelligence/codebox_client';

export { SIGNIFICANT_EVENTS_LOGGING_QUERIES_VALIDATE_TOOL_ID } from '../tool_ids';

const MAX_GREPS = 20;
const MAX_SAMPLE_LINES = 3;

const validateLoggingQueriesSchema = z.object({
  repository: z
    .string()
    .max(MAX_ID_LENGTH)
    .describe('Repository as "org/repo" (e.g. "supabase/realtime").'),
  git_commit: z
    .string()
    .max(MAX_ID_LENGTH)
    .describe(
      'Immutable commit SHA the repository is indexed at. Every grep is scoped to this commit so validation is reproducible.'
    ),
  git_ref_key: z
    .string()
    .max(256)
    .default('')
    .describe(
      'Composite ref key (`git.ref_key`) scoping validation to an incremental (branch-indexed) corpus via a `LOOKUP JOIN`. Empty (default) scopes by `git_commit` against a snapshot-indexed corpus instead.'
    ),
  greps: z
    .array(
      z.object({
        regex: z
          .string()
          .max(MAX_TEXT_LENGTH)
          .describe(
            dedent`Lucene RLIKE regex to validate. Whole-value anchored, so wrap the pattern in \`.*\`.
            A literal paren is \`[(]\`; a literal dot is \`[.]\`. No \`\\b\` / \`\\s\` / \`\\d\`
            (Lucene RLIKE has none). JS syntax (\`\\(\`, \`/.../g\`) parses but matches nothing.`
          ),
        evidence: z
          .object({
            path: z
              .string()
              .max(MAX_ID_LENGTH)
              .describe('Repository-relative file path the grep was written to match.'),
            line: z
              .number()
              .int()
              .min(1)
              .describe('Line number in that file the grep was written to match.'),
          })
          .describe(
            'The `path:line` the agent based this grep on. Used to prove the grep matched the line it was written for, not something incidental.'
          ),
      })
    )
    .min(1)
    .max(MAX_GREPS)
    .describe(
      'Candidate greps to validate, each with the evidence line it was based on. The agent iterates until every returned grep reports `pass: true`, or returns an empty list when the repository has no house wrapper.'
    ),
});

export function createValidateLoggingQueriesTool({
  getScopedClients,
  server,
  logger,
}: {
  getScopedClients: GetScopedClients;
  server: StreamsServer;
  logger: Logger;
}): StaticToolRegistration<typeof validateLoggingQueriesSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof validateLoggingQueriesSchema> = {
    id: SIGNIFICANT_EVENTS_LOGGING_QUERIES_VALIDATE_TOOL_ID,
    type: ToolType.builtin,
    description: dedent`
      Validate candidate Lucene RLIKE greps that match a repository's house logging
      wrappers (functions/macros the repo defines so other code can log without naming
      a logger, e.g. \`log_error(...)\`, \`serverLog(level, ...)\`).

      For each grep, issues one ES|QL query against the indexed source for the given
      repository + commit and returns:
      - \`hits\`: the hit count on the indexed commit (persisted as the drift baseline);
      - \`covers_evidence\`: whether the grep matched its own evidence \`path:line\` —
        proves it matched the line it was written for, not something incidental;
      - \`hit_ratio\`: \`hits / repo_total_lines\`;
      - \`pass\`: \`covers_evidence AND hit_ratio < ceiling\` — the gate a grep must clear
        before it is persisted;
      - \`error\`: populated only for \`invalid_syntax\` (malformed RLIKE) and
        \`query_failed\` (transport failure); always \`null\` otherwise, including the
        zero-hit case;
      - \`sample\`: up to ${MAX_SAMPLE_LINES} \`path:line\` hits, fetched only for \`ok\` /
        \`evidence_missed\`.

      Use the report to REPAIR a failed grep: \`hits: 0\` means anchoring or escaping;
      \`hits: 500, covers_evidence: false\` means it matched the wrong thing; a populated
      \`error\` carries the Elasticsearch reason with a character position. Iterate until
      every grep reports \`pass: true\`, or return an empty list when the repository has
      no house wrapper (a correct and common answer).
    `,
    schema: validateLoggingQueriesSchema,
    tags: ['streams', 'significant-events', 'code-intelligence'],
    availability: {
      cacheMode: 'space',
      handler: async (): Promise<{ status: 'available' | 'unavailable'; reason?: string }> => {
        try {
          await assertSignificantEventsAccess({
            server,
            licensing: server.licensing,
          });
          return { status: 'available' };
        } catch (error) {
          if (error instanceof Error) {
            logger.debug(error.stack ?? error.message);
          } else {
            logger.debug(String(error));
          }
          return {
            status: 'unavailable',
            reason:
              error instanceof Error
                ? error.message
                : 'Significant events access is not available in the current context',
          };
        }
      },
    },
    handler: async (toolParams, context) => {
      const { request } = context;

      try {
        const scopedClients = await getScopedClients({ request });
        await assertSignificantEventsAccess({
          server,
          licensing: scopedClients.licensing,
        });

        const codebox = await getCodeboxClient({ actions: server.actions, request, logger });
        const output: ValidateLoggingQueriesOutput = await validateLoggingQueriesHandler({
          codebox,
          repository: toolParams.repository,
          gitCommit: toolParams.git_commit,
          greps: toolParams.greps,
          logger,
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: output,
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Error running logging_queries_validate: ${message}`);
        if (error instanceof Error) {
          logger.debug(error.stack ?? error.message);
        } else {
          logger.debug(String(error));
        }

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to validate logging queries: ${message}`,
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}
