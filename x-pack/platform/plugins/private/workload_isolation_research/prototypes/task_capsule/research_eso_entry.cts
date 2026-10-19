/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { createRequire } = require('node:module') as typeof import('node:module');
const { dirname, join } = require('node:path') as typeof import('node:path');
const { parentPort, workerData, threadId } =
  require('node:worker_threads') as typeof import('node:worker_threads');
const input = workerData as { module: string; primaryKey: string; rotatedKey: string };
if (input.module !== 'eso_capability_probe_v1')
  throw new Error('Rejected research module descriptor');
process.env.NODE_DISABLE_COMPILE_CACHE = '1';
process.env.DISABLE_SWC_REGISTER_CACHE = '1';
delete process.env.DEBUG_SWC_REGISTER_CACHE;
const dependencies = createRequire(join(process.cwd(), 'package.json'));
dependencies('@kbn/setup-node-env');
// One fixed private module descriptor, not a caller-supplied file path or public plugin export.
const publicEntry = dependencies.resolve('@kbn/encrypted-saved-objects-plugin/server');
const privateEntry = join(dirname(publicEntry), 'research_eso_probe');
const { executeResearchEsoProbe } = dependencies(privateEntry) as {
  executeResearchEsoProbe(keys: {
    primaryKey: string;
    rotatedKey: string;
  }): Promise<{ checks: readonly string[]; heapUsed: number }>;
};
void executeResearchEsoProbe(input).then(
  (result) => parentPort?.postMessage({ ok: true, threadId, ...result }),
  (error: Error) =>
    parentPort?.postMessage({
      ok: false,
      stage: error.message.startsWith('Research ESO check failed:') ? error.message : error.name,
    })
);
