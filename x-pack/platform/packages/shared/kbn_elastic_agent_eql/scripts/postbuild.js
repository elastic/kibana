/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { join } = require('path');
const { readdirSync, readFileSync, writeFileSync } = require('fs');

const antlrDir = join(__dirname, '..', 'src', 'antlr');

// ANTLR4's TypeScript target emits code that doesn't satisfy Kibana's stricter
// tsconfig rules. Prepend `// @ts-nocheck` to every generated .ts file so type
// checks skip them — application code that consumes the parser (src/validate.ts)
// is still fully type-checked. Idempotent: skips files that already have the line.
for (const file of readdirSync(antlrDir)) {
  if (!file.endsWith('.ts')) continue;
  const path = join(antlrDir, file);
  const content = readFileSync(path, 'utf8');
  if (/^\/\/\s*@ts-nocheck/.test(content)) continue;
  writeFileSync(path, `// @ts-nocheck\n${content}`, 'utf8');
}
