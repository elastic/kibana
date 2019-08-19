/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionType, ActionTypeExecutorOptions, ActionTypeExecutorResult } from '../types';

// action type definition
export const actionType: ActionType = {
  id: '.webhook',
  name: 'webhook',
  executor,
};

// action executor
async function executor(execOptions: ActionTypeExecutorOptions): Promise<ActionTypeExecutorResult> {
  return {
    status: 'error',
  };
}
