/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreTasksStart } from '@kbn/core/server';
import { CONTEXT_ENGINE_FEEDBACK_LOOP_ENABLED_SETTING_ID } from '../../common/constants';

/** Reads the global feedback loop advanced setting, as the internal user. */
export const createIsFeedbackLoopEnabled = (
  coreStart: Pick<CoreTasksStart, 'savedObjects' | 'uiSettings'>
): (() => Promise<boolean>) => {
  const soClient = coreStart.savedObjects.createInternalRepository();
  const globalUiSettings = coreStart.uiSettings.globalAsScopedToClient(soClient);
  return async () =>
    (await globalUiSettings.get<boolean>(CONTEXT_ENGINE_FEEDBACK_LOOP_ENABLED_SETTING_ID)) ?? false;
};
