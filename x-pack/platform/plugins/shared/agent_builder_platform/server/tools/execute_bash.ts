/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { loadBash } from './load_just_bash';

const MAX_STDOUT_LENGTH = 50_000;
const MAX_STDERR_LENGTH = 10_000;
const EXECUTION_TIMEOUT_MS = 30_000;

const executeBashSchema = z.object({
  script: z.string().describe('The bash script or command to execute in the virtual environment.'),
  files: z
    .record(z.string(), z.string())
    .optional()
    .describe(
      'Optional map of file paths to content to pre-populate the virtual filesystem before execution. Example: { "/data/input.json": \'{"key":"value"}\' }'
    ),
});

export const executeBashTool = (): BuiltinToolDefinition<typeof executeBashSchema> => {
  return {
    id: platformCoreTools.executeBash,
    type: ToolType.builtin,
    description: `Execute bash commands in a virtual sandboxed environment with an in-memory filesystem.
This tool provides a full bash shell with support for:
- Standard Unix commands: ls, cat, grep, awk, sed, sort, uniq, wc, head, tail, find, etc.
- Data processing: jq (JSON), yq (YAML/XML/TOML), xan (CSV)
- Python execution via python3
- File operations: create, read, write, transform files
- Pipes, redirections, variables, loops, functions, and other shell features

Use this tool when you need to:
- Transform or process data (parse JSON, filter CSV, reshape text)
- Write and run scripts to solve computational problems
- Manipulate files in a virtual filesystem
- Chain multiple Unix commands together via pipes
- Run Python code for complex logic

The environment is stateless: each invocation starts fresh. Use the 'files' parameter to provide input data.
Output is capped at ${MAX_STDOUT_LENGTH} characters for stdout and ${MAX_STDERR_LENGTH} for stderr.`,
    schema: executeBashSchema,
    handler: async ({ script, files }, { logger, events }) => {
      logger.debug(`execute_bash tool called with script length: ${script.length}`);
      events.reportProgress('Executing bash script in virtual environment');

      try {
        const Bash = await loadBash();
        const bash = new Bash({
          files,
          python: true,
        });

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), EXECUTION_TIMEOUT_MS);

        let result;
        try {
          result = await bash.exec(script, { signal: controller.signal });
        } finally {
          clearTimeout(timeout);
        }

        const stdout = truncate(result.stdout, MAX_STDOUT_LENGTH);
        const stderr = truncate(result.stderr, MAX_STDERR_LENGTH);

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                stdout,
                stderr,
                exitCode: result.exitCode,
                ...(stdout !== result.stdout && { stdoutTruncated: true }),
                ...(stderr !== result.stderr && { stderrTruncated: true }),
              },
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`execute_bash tool error: ${message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Bash execution failed: ${message}`,
              },
            },
          ],
        };
      }
    },
    tags: ['scripting', 'data-processing'],
  };
};

const truncate = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) {
    return value;
  }
  return value.substring(0, maxLength) + '\n... [output truncated]';
};
