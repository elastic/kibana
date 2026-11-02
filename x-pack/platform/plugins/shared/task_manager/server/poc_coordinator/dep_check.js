/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * PoC: coordination/execution seam — HARD GATE enforcement.
 *
 * Success criterion #1 of the PRD: the coordination module must be
 * instantiable with only { esClient, logger, config, serializer } and must not
 * drag in task_pool, task_running, the full TaskStore, or CoreStart machinery.
 *
 * This script enforces that mechanically:
 *   1. Loads the coordinator entry point in a bare Node context (dev
 *      transpiler installed, no Kibana server).
 *   2. Scans require.cache for forbidden module paths (runtime imports only —
 *      `import type` is erased and correctly ignored).
 *   3. Instantiates TaskCoordinator with ONLY the sanctioned dependency set:
 *      a stub esClient object, a standalone SavedObjectsSerializer, a console
 *      logger and a schema-validated default TaskManagerConfig.
 *
 * Run:  node x-pack/platform/plugins/shared/task_manager/server/poc_coordinator/dep_check.js
 */

/* eslint-disable @typescript-eslint/no-var-requires, no-console */

require('@kbn/setup-node-env');

const FORBIDDEN_PATTERNS = [
  // execution-side task manager modules
  { pattern: /task_manager\/server\/task_pool\//, label: 'task_pool' },
  { pattern: /task_manager\/server\/task_running\//, label: 'task_running' },
  { pattern: /task_manager\/server\/task_store\.(ts|js)$/, label: 'full TaskStore' },
  { pattern: /task_manager\/server\/buffered_task_store/, label: 'BufferedTaskStore' },
  { pattern: /task_manager\/server\/task_scheduling/, label: 'TaskScheduling' },
  { pattern: /task_manager\/server\/polling_lifecycle/, label: 'TaskPollingLifecycle' },
  { pattern: /task_manager\/server\/routes\//, label: 'routes' },
  { pattern: /task_manager\/server\/monitoring\//, label: 'monitoring' },
  // CoreStart contract implementations
  { pattern: /src\/core\/server\//, label: '@kbn/core/server barrel' },
  { pattern: /core-lifecycle-server/, label: 'CoreStart lifecycle contracts' },
  { pattern: /core-plugins-server/, label: 'core plugins service' },
  { pattern: /core-saved-objects-api-server/, label: 'SavedObjects repository/API' },
  { pattern: /core-saved-objects-import-export/, label: 'SavedObjects import/export' },
  { pattern: /core-elasticsearch-server-internal/, label: 'core ES service implementation' },
  { pattern: /core-http-server-internal/, label: 'core http service implementation' },
];

const main = () => {
  const before = Object.keys(require.cache).length;

  // 1 + 2: load the coordinator module graph and audit it.
  const coordinatorModule = require('.');
  const configModule = require('../config');
  const {
    SavedObjectsSerializer,
    SavedObjectTypeRegistry,
  } = require('@kbn/core-saved-objects-base-server-internal');

  const loaded = Object.keys(require.cache);
  const violations = [];
  for (const modulePath of loaded) {
    for (const { pattern, label } of FORBIDDEN_PATTERNS) {
      if (pattern.test(modulePath)) {
        violations.push({ label, modulePath });
      }
    }
  }

  console.log(`Loaded ${loaded.length - before} modules for the coordinator graph.`);

  if (violations.length > 0) {
    console.error('\nDEPENDENCY GATE: FAILED. Forbidden modules in the coordinator graph:');
    for (const { label, modulePath } of violations) {
      console.error(`  [${label}] ${modulePath}`);
    }
    process.exit(1);
  }
  console.log('Module-graph audit: no task_pool / task_running / TaskStore / CoreStart modules.');

  // 3: instantiate with only { esClient, logger, config, serializer } + plain data.
  const { TaskCoordinator } = coordinatorModule;
  const config = configModule.configSchema.validate({});

  const registry = new SavedObjectTypeRegistry();
  registry.registerType({
    name: 'task',
    hidden: true,
    namespaceType: 'agnostic',
    mappings: { properties: {} },
  });
  const serializer = new SavedObjectsSerializer(registry);

  const logger = {
    trace: () => {},
    debug: () => {},
    info: (msg) => console.log(`  [coordinator] ${msg}`),
    warn: (msg) => console.warn(`  [coordinator] ${msg}`),
    error: (msg) => console.error(`  [coordinator] ${msg}`),
  };

  // A stub: the constructor must not need a real client (nothing may touch ES
  // until start()).
  const esClient = {};

  const { Subject } = require('rxjs');
  const capacity$ = new Subject();
  const executionReport$ = new Subject();

  const coordinator = new TaskCoordinator({
    esClient,
    logger,
    config,
    serializer,
    context: {
      taskManagerId: 'kibana:dep-check',
      podName: 'dep-check',
      taskIndex: '.kibana_task_manager',
      claimNudgeIndex: '.kibana_task_manager_claim_nudge',
      isServerless: false,
      definitions: [
        { type: 'depCheckTask', cost: 2, maxAttempts: 3 },
        { type: 'depCheckLimited', cost: 2, maxConcurrency: 1 },
      ],
      startingCapacity: 10,
      excludedTaskTypes: [],
    },
    capacity$,
    executionReport$,
  });

  // channels accept input without a live executor
  capacity$.next({
    availableCapacity: 8,
    availableCapacityByType: { depCheckLimited: 2 },
    usedCapacityPercentage: 20,
    paused: false,
    pausedTaskTypes: [],
    takenAt: Date.now(),
  });
  executionReport$.next({ tmUtilization: 10, takenAt: Date.now() });

  coordinator.stop();

  console.log(
    'Instantiation: TaskCoordinator constructed from { esClient, logger, config, serializer } + plain-data context only.'
  );
  console.log('\nDEPENDENCY GATE: PASSED');
};

main();
