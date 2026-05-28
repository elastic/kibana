/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { internalTools } from '@kbn/agent-builder-common/tools';
import { createOtherResult } from '@kbn/agent-builder-server';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server/tools';
import type { IBashService } from '@kbn/agent-builder-server/runner';

const schema = z.object({
  command: z
    .string()
    .describe(
      'The bash command(s) to execute. Can be a single command, a pipeline, or a multi-line script.'
    ),
});

// NOTE: description below is a draft against the design's 7-point content
// checklist. Final wording is tuned manually after implementation.
const description = [
  'Run a bash command in a sandboxed shell. The shell can compose tool calls with standard Unix utilities (grep, awk, jq, tee, etc.).',
  '',
  'Filesystem layout:',
  '- /workspace: persistent across rounds AND across conversation resumptions',
  '- /tool_calls/<tool_id>/<tool_call_id>/<tool_result_id>.json: read-only view of prior tool results in this conversation',
  '- /skills/...: read-only skill files',
  '- /tmp, /home/user, other paths: EPHEMERAL — gone after this call',
  '- Default cwd is /tmp; use absolute paths under /workspace to persist',
  '',
  'Use exec_tool to invoke another Agent Builder tool from the shell:',
  "  exec_tool <tool_id> --args='{...}'",
  '  exec_tool platform_core_generate_esql --args=\'{"query":"..."}\' | jq',
  '',
  'Both sanitized tool names (as listed in your tools) and underscore-namespaced internal IDs are accepted.',
  '',
  'Output is JSON-serialized to stdout on success; the command exit code is returned.',
  'Stdout and stderr are truncated past a token safeguard for the model — the truncated flag will be set in the result.',
  '',
  'NOT available: python, js-exec, sqlite3, curl, html-to-markdown, network access.',
  '',
  'Prefer bash for composition, piping, and writing files. Prefer read_file for a single-file read with token-managed output.',
].join('\n');

export const createBashTool = ({
  bashService,
}: {
  bashService: IBashService;
}): BuiltinToolDefinition<typeof schema> => {
  return {
    id: internalTools.bash,
    description,
    type: ToolType.builtin,
    schema,
    tags: ['bash'],
    handler: async ({ command }) => {
      const result = await bashService.exec(command);
      return { results: [createOtherResult(result)] };
    },
  };
};
