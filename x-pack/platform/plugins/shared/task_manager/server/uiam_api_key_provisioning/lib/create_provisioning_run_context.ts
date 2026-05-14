/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import { INVALIDATE_API_KEY_SO_NAME, TASK_SO_NAME } from '../../saved_objects';
import type { TaskManagerPluginsStart, TaskManagerStartContract } from '../../plugin';
import { UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE } from '../uiam_api_keys_provisioning_status_saved_object';
import type { TaskManagerUiamProvisioningRunContext } from '../types';

/**
 * Builds the shared context for a Task Manager UIAM provisioning run
 * (mirrors {@link createProvisioningRunContext} in
 * `alerting/server/provisioning/lib/create_provisioning_run_context.ts`).
 */
export const createProvisioningRunContext = async (
  core: CoreSetup<TaskManagerPluginsStart, TaskManagerStartContract>
): Promise<TaskManagerUiamProvisioningRunContext> => {
  const [coreStart, , taskManager] = await core.getStartServices();
  const uiamConvert = coreStart.security?.authc?.apiKeys?.uiam?.convert;
  if (typeof uiamConvert !== 'function') {
    throw new Error('UIAM convert API is not available');
  }
  const savedObjectsClient = coreStart.savedObjects.createInternalRepository([
    TASK_SO_NAME,
    UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
    INVALIDATE_API_KEY_SO_NAME,
  ]);
  return {
    coreStart,
    taskManager,
    savedObjectsClient,
    uiamConvert,
  };
};
