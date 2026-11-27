/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { AlertEventsClientApi } from '../../types';
import { getCreateSignalEventStepDefinition } from './steps/create_signal_event_step';

export function registerCreateSignalEventStep(
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup,
  getAlertEventsClient: (request: KibanaRequest) => Promise<AlertEventsClientApi>,
  checkAlertWritePrivilege: (request: KibanaRequest) => Promise<boolean>
): void {
  workflowsExtensions.registerStepDefinition(
    getCreateSignalEventStepDefinition(getAlertEventsClient, checkAlertWritePrivilege)
  );
}
