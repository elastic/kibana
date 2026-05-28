/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CommandName } from 'just-bash';

/**
 * Explicit allowlist of just-bash built-in commands enabled in Agent Builder.
 *
 * Intentionally excluded:
 *  - sqlite3 — depends on sql.js WASM (import.meta.url) which doesn't load via CJS
 *  - python, python3 — Python via CPython WASM; same WASM issue + security surface
 *  - js-exec, node — JS/TS via QuickJS; security surface, not needed
 *  - curl, html-to-markdown — network access, needs explicit security model
 *  - ln, readlink — symlinks aren't supported by workspace volume / persistence,
 *  - tar — pulls in `node-liblzma` and `@mongodb-js/zstd`for compressed-archive support. Disabled until we
 */
export const ALLOWED_BASH_COMMANDS: readonly CommandName[] = [
  'alias',
  'awk',
  'base64',
  'basename',
  'bash',
  'cat',
  'chmod',
  'clear',
  'column',
  'comm',
  'cp',
  'cut',
  'date',
  'diff',
  'dirname',
  'du',
  'echo',
  'egrep',
  'env',
  'expand',
  'expr',
  'false',
  'fgrep',
  'file',
  'find',
  'fold',
  'grep',
  'gunzip',
  'gzip',
  'head',
  'help',
  'history',
  'hostname',
  'join',
  'jq',
  'ls',
  'md5sum',
  'mkdir',
  'mv',
  'nl',
  'od',
  'paste',
  'printenv',
  'printf',
  'pwd',
  'rev',
  'rg',
  'rm',
  'rmdir',
  'sed',
  'seq',
  'sh',
  'sha1sum',
  'sha256sum',
  'sleep',
  'sort',
  'split',
  'stat',
  'strings',
  'tac',
  'tail',
  'tee',
  'time',
  'timeout',
  'touch',
  'tr',
  'tree',
  'true',
  'unalias',
  'unexpand',
  'uniq',
  'wc',
  'which',
  'whoami',
  'xan',
  'xargs',
  'yq',
  'zcat',
] as const satisfies readonly CommandName[];
