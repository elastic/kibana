/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { definePodPlugin } from '@kbn/task-manager-plugin/server/task_pod';
import { podPlugins as maintenanceWindowsPodPlugins } from '@kbn/maintenance-windows-plugin/server/task_pod';
import { podPlugins as licensingPodPlugins } from '@kbn/licensing-plugin/server/task_pod';
import { podPlugins as securityPodPlugins } from '@kbn/security-plugin/server/task_pod';
import { podPlugins as spacesPodPlugins } from '@kbn/spaces-plugin/server/task_pod';
import { podPlugins as eventLogPodPlugins } from '@kbn/event-log-plugin/server/task_pod';
import { ContainerModule } from 'inversify';
import { OnSetup } from '@kbn/core-di';
import { podPlugins as encryptedSavedObjectsPodPlugins } from '@kbn/encrypted-saved-objects-plugin/server/task_pod';
import { AlertStatusChangedOptIns } from './lib/alert_status_changed';
import { configSchema } from './config';
import { RemoteAlertStatusChangedOptIns } from './pod_contracts/alert_status_changed';
import {
  workflowsExtensionsPodPlugin,
  workflowsManagementPodPlugin,
} from './pod_contracts/workflows';
import { bindTaskRuntime } from './setup/bind_task_runtime';

/**
 * Runs this plugin's tasks (rule executor, dispatcher, API key invalidation, telemetry, alert
 * actions cleanup) in a task pod. It loads the same task runtime module Kibana loads, so a task
 * runs the same code in either place.
 */
/**
 * The task runtime Kibana runs, with the parts that depend on Kibana-only state swapped for calls
 * back to Kibana: alert status change opt-ins are functions other plugins registered there.
 */
const podRuntimeModule = new ContainerModule((options) => {
  bindTaskRuntime(options);
  options.bind(OnSetup).toConstantValue((container) => {
    container
      .rebind(AlertStatusChangedOptIns)
      .to(RemoteAlertStatusChangedOptIns)
      .inSingletonScope();
  });
});

export const podPlugins = [
  definePodPlugin({
    id: 'alertingVTwo',
    configPath: ['xpack', 'alerting_v2'],
    configSchema,
    requiredPlugins: [
      'taskManager',
      'encryptedSavedObjects',
      'eventLog',
      'spaces',
      'security',
      'licensing',
      'workflowsExtensions',
      'workflowsManagement',
      'maintenanceWindows',
    ],
    module: podRuntimeModule,
  }),
  // Dependencies, local (built from the owning plugin's code) and remote (calls back to Kibana).
  ...spacesPodPlugins,
  ...securityPodPlugins,
  ...licensingPodPlugins,
  ...maintenanceWindowsPodPlugins,
  ...eventLogPodPlugins,
  ...encryptedSavedObjectsPodPlugins,
  workflowsExtensionsPodPlugin,
  workflowsManagementPodPlugin,
];
