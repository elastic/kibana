/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Light public entry for plugins that want to run their tasks in a task pod. Importing this does
 * not pull in the host (core-di internals, saved objects, the HTTP server), only the definition
 * helpers, so it is cheap to import from a plugin's `server/task_pod.ts`.
 */
export { definePodPlugin } from './host/define_pod_plugin';
export type { PodPluginDefinition, PodPluginInitializerContext } from './host/define_pod_plugin';
export { callKibana, podContract, remoteContract } from './host/remote';
