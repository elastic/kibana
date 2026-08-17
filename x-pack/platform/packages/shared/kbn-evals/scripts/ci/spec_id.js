/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Stable short id for a spec, derived from its path so the path stays declared once (in a suite's
// shards). `evals/discovery/discovery.spec.ts` -> `discovery`. Used to key `specModelGroups` and,
// later, `models:<specId>:<group>` PR labels, so it must survive as a plain, label-safe token.
function pathToSpecId(specFile) {
  const base = String(specFile).split('/').pop();
  return base.replace(/\.spec\.ts$/, '');
}

module.exports = { pathToSpecId };
