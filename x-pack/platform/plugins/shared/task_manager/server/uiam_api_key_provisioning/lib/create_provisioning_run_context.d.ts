/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import type { TaskManagerPluginsStart, TaskManagerStartContract } from '../../plugin';
import type { TaskManagerUiamProvisioningRunContext } from '../types';
/**
 * Builds the shared context for a Task Manager UIAM provisioning run
 * (mirrors {@link createProvisioningRunContext} in
 * `alerting/server/provisioning/lib/create_provisioning_run_context.ts`).
 */
export declare const createProvisioningRunContext: (
  core: CoreSetup<TaskManagerPluginsStart, TaskManagerStartContract>
) => Promise<TaskManagerUiamProvisioningRunContext>;
