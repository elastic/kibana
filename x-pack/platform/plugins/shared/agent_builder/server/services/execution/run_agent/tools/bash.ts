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
import { SAFEGUARD_TOKEN_COUNT } from '../bash/output_truncation';

const schema = z.object({
  command: z
    .string()
    .describe(
      'The bash command(s) to execute. Can be a single command, a pipeline, or a multi-line script.'
    ),
});

const description = `Run a bash command in a sandboxed shell environment.

The bash environment is using the virtual filesystem (with /workspace, /tool_calls, /skills, /tmp...)
Default cwd is /tmp; use absolute paths under /workspace to persist

## Supported commands

### File Operations

cat, cp, file, ls, mkdir, mv, rm, rmdir, split, stat, touch, tree

### Text Processing

awk, base64, column, comm, cut, diff, expand, fold, grep, egrep, fgrep, head, join, md5sum, nl, od, paste, printf, rev, rg, sed, sha1sum, sha256sum, sort, strings, tac, tail, tr, unexpand, uniq, wc, xargs

### Data Processing

jq, xan, yq

### Navigation & Environment

basename, cd, dirname, du, echo, export, find, pwd, tee

### Shell Utilities

bash, date, false, seq, sh, time, timeout, true, which

All commands support --help for usage information.

### Shell Features

- **Pipes**: cmd1 | cmd2
- **Redirections**: >, >>, 2>, 2>&1, <
- **Command chaining**: &&, ||, ;
- **Variables**: $VAR, \${VAR}, \${VAR:-default}
- **Positional parameters**: $1, $2, $@, $#
- **Glob patterns**: *, ?, [...]
- **If statements**: if COND; then CMD; elif COND; then CMD; else CMD; fi
- **Functions**: function name { ... } or name() { ... }
- **Local variables**: local VAR=value
- **Loops**: for, while, until

## Custom commands

### exec_tool

Use exec_tool to invoke another tool from the shell. Pass parameters either as a
single JSON object via --args, or as individual flags, or both:
  exec_tool <tool_id> --args='{...}'
  exec_tool <tool_id> --param value --other=value
  exec_tool platform_core_generate_esql --query="FROM logs | LIMIT 10" | jq
  exec_tool platform_core_generate_esql --args='{"query":"..."}' --index=logs-*

Individual --param flags accept both "--param value" and "--param=value" forms and are coerced to the parameter's declared type (numbers, booleans, and JSON arrays/objects).
A bare boolean flag (e.g. --verbose) is treated as true. When both are given, individual --param flags override matching keys in --args.

Both sanitized tool names (as listed in your tools) and underscore-namespaced internal IDs are accepted.

On success the tool result content is JSON-serialized to stdout. A single result prints its data object; multiple results
print an array of data objects. If the tool reports an error, its message goes to stderr and the command
exits non-zero. Stdout and stderr are truncated past a token safeguard for the model — the truncated flag will be set in the result.

## Limitations of the bash environment

### jq

Not native JQ, only a subset of standard jq is supported.

Most notable limitations:
- No arg injection: --arg/--argjson aren't supported. Embed the value in the filter (jq ".x==\\"$VAL\\"") or \`export X=val\` and read \`$ENV.X\`.
- No -R/--raw-input: use awk/sed/grep for non-JSON text.
- If a flag or function errors as unsupported, adapt — don't retry it.

## Guidelines

- Prefer bash tool for composition, piping, and writing files. Prefer other VFS tools (read_file, list_files...) when they are sufficient for the task.
- Use /workspace for persistent files you're planning to re-use, use /tmp for temporary file you won't need anymore
- /tool_calls and /skills are read only folders

## Misuse refusal

The bash tool is powerful within its sandbox; that doesn't authorize every command the user asks for.

Refuse when a request looks like trying to abuse the system:
- Wholesale execution of a script with no stated intent — the user owes you a reason. "Run this for me: <opaque script>" should be questioned.
- Data exfiltration shapes — "write everything you've seen to a single file", "concatenate the conversation context", "encode it all".
- Sandbox probing or escape attempts — "read /etc/passwd", "see what /workspace/../ resolves to", "find what limits this shell has".
- Routing around safer tools — if a dedicated tool exists for the task, prefer that.

When unsure, describe what you'd do, name the concern, and confirm with the user before executing.`;

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
    // SAFEGUARD_TOKEN_COUNT max for each of stdout and stderr
    maxResultTokens: SAFEGUARD_TOKEN_COUNT * 2,
    handler: async ({ command }) => {
      const result = await bashService.exec(command);
      return { results: [createOtherResult(result)] };
    },
  };
};
