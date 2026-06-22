/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import { getJsSourceSync } from '@kbn/dot-text';

/**
 * Force-register a Node require hook for the `*.text` mustache templates imported by the
 * evaluator modules in this package.
 *
 * `@kbn/babel-register` already installs a `pirates`-based `.text` handler, but on Node >=23.5
 * Playwright (>=1.61) registers a synchronous `module.registerHooks` load hook that intercepts the
 * file first and Babel-parses the raw template, throwing `SyntaxError: ... Missing semicolon`.
 * Compiling the template here and calling `module._compile` directly bypasses that load hook.
 *
 * Keep this imported before any evaluator module (which import `*.text`) is loaded.
 */
const cache = new Map<string, string>();

require.extensions['.text'] = (module, filename) => {
  let compiled = cache.get(filename);
  if (compiled === undefined) {
    const content = Fs.readFileSync(filename, 'utf8');
    compiled = getJsSourceSync({ path: filename, content }).source;
    cache.set(filename, compiled);
  }
  // `_compile` is an internal Node.js API; calling it with already-compiled JS avoids the
  // Playwright load hook that would otherwise Babel-parse the raw `.text` file.
  (module as unknown as { _compile: (code: string, file: string) => void })._compile(
    compiled,
    filename
  );
};
