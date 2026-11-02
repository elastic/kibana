/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Contracts a task pod reaches back into Kibana for. Each file has both halves of one contract:
 * the pod-side adapter (what `PluginSetup/PluginStart('<plugin>')` resolves to in a pod) and the
 * Kibana-side handlers registered with Task Manager's `registerPodContract`. Ids are namespaced
 * with this plugin so another task owner can register its own view of the same plugin.
 *
 * These cover only the members alerting v2's tasks use (workflows and alert status change
 * opt-ins). They are owned here because the plugins behind them (workflows lives under `src/`, which
 * cannot reference x-pack Task Manager) cannot ship a pod contract themselves yet; once a shared
 * package for pod authoring exists, each owner should.
 */
export const POD_CONTRACT_PREFIX = 'alertingVTwo';
