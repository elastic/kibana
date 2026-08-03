/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ParsedParam {
  key: string;
  /** undefined => bare flag (e.g. `--verbose`), resolved against the schema later. */
  value?: string;
}

export interface ParsedArgs {
  toolId?: string;
  argsRaw?: string;
  params?: ParsedParam[];
  error?: string;
}

/**
 * Hand-rolled argv parser for `exec_tool`: one positional tool id, an optional
 * `--args=<json>` / `--args <json>` base object, and any number of individual
 * `--key=value` / `--key value` / bare `--flag` params. Purely structural — it
 * has no knowledge of the target tool's schema (see `param_coercion`).
 */
export const parseExecToolArgs = (argv: string[]): ParsedArgs => {
  if (argv.length === 0) {
    return { error: 'exec_tool: missing tool id argument' };
  }
  const [toolId, ...rest] = argv;
  let argsRaw: string | undefined;
  const params: ParsedParam[] = [];

  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];

    if (a.startsWith('--args=')) {
      argsRaw = a.slice('--args='.length);
      continue;
    }
    if (a === '--args') {
      const next = rest[i + 1];
      if (next === undefined || next.startsWith('--')) {
        return { error: "exec_tool: --args requires a value (use --args='<json>')" };
      }
      argsRaw = next;
      i++;
      continue;
    }
    if (a.startsWith('--')) {
      const body = a.slice(2);
      const eq = body.indexOf('=');
      if (eq >= 0) {
        const key = body.slice(0, eq);
        if (key === '') {
          return { error: `exec_tool: invalid flag '${a}'` };
        }
        params.push({ key, value: body.slice(eq + 1) });
        continue;
      }
      if (body === '') {
        return { error: `exec_tool: invalid flag '${a}'` };
      }
      const next = rest[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        params.push({ key: body, value: next });
        i++;
      } else {
        params.push({ key: body, value: undefined });
      }
      continue;
    }

    return { error: `exec_tool: unexpected argument '${a}'` };
  }

  return { toolId, argsRaw, params };
};
