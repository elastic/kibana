/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { createRequire } = require('node:module') as typeof import('node:module');
const { join } = require('node:path') as typeof import('node:path');
const { parentPort, workerData } =
  require('node:worker_threads') as typeof import('node:worker_threads');
const graphs = {
  alerting: [
    'x-pack/platform/plugins/shared/alerting/server/task_runner/task_runner_factory',
    'x-pack/platform/plugins/shared/alerting/server/rule_type_registry',
    'x-pack/platform/plugins/shared/stack_alerts/server/rule_types/es_query/rule_type',
  ],
  workflow: [
    'src/platform/plugins/shared/workflows_execution_engine/server/execution_functions/run_workflow',
    'src/platform/plugins/shared/workflows_execution_engine/server/workflow_execution_loop/workflow_execution_loop',
  ],
  agent: [
    'x-pack/platform/plugins/shared/agent_builder/server/services/execution/runner/runner_factory',
    'x-pack/platform/plugins/shared/agent_builder/server/services/execution/runner/runner',
  ],
} as const;
const family = workerData.family as keyof typeof graphs;
if (!(family in graphs) || !parentPort) throw new Error('Expected allowlisted graph worker');
if (!global.gc) throw new Error('Run parent with --expose-gc');
process.env.DISABLE_SWC_REGISTER_CACHE = '1';
process.env.NODE_DISABLE_COMPILE_CACHE = '1';
const root = process.cwd();
const dependencies = createRequire(join(root, 'package.json'));
const snapshot = () => {
  global.gc?.();
  const memory = process.memoryUsage();
  return {
    heap_used: memory.heapUsed,
    rss: memory.rss,
    external: memory.external,
    array_buffers: memory.arrayBuffers,
  };
};
const started = performance.now();
const bare = snapshot();
dependencies('@kbn/setup-node-env');
const loader = snapshot();
const held: object[] = [];
let currentModule = '';
try {
  for (const modulePath of graphs[family]) {
    currentModule = modulePath;
    held.push(dependencies(join(root, modulePath)) as object);
  }
  const after = snapshot();
  let cloneFailure = '';
  try {
    structuredClone(held);
  } catch (error) {
    cloneFailure = error instanceof Error ? error.name : String(error);
  }
  let constructorFailure = '';
  if (family === 'alerting') {
    const { TaskRunnerFactory } = held[0] as { TaskRunnerFactory: new () => object };
    const factory = new TaskRunnerFactory();
    try {
      Reflect.apply(Reflect.get(factory, 'createAdHoc'), factory, [{}]);
    } catch (error) {
      constructorFailure = error instanceof Error ? error.message : String(error);
    }
  }
  parentPort.postMessage({
    ok: true,
    family,
    modules: graphs[family],
    bare,
    loader,
    after,
    load_ms: performance.now() - started,
    clone_failure: cloneFailure,
    constructor_failure: constructorFailure,
    scope: 'code_graph_floor_excludes_initialised_services_data_and_task_execution',
    initialized_services: false,
  });
} catch (error) {
  parentPort.postMessage({
    ok: false,
    family,
    failed_module: currentModule,
    completed_modules: held.length,
    bare,
    loader,
    after: snapshot(),
    load_ms: performance.now() - started,
    error: error instanceof Error ? error.message : String(error),
  });
}
parentPort.on('message', (message: string) => {
  if (message === 'snapshot') parentPort?.postMessage({ family, resident: snapshot() });
  if (message === 'close') parentPort?.close();
});
