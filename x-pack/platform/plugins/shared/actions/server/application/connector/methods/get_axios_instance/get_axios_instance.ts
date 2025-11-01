/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosInstance } from 'axios';
import type { GetAxiosParams } from '../../../../lib/action_executor';
import type { ActionsClientContext } from '../../../../actions_client';

export async function getAxiosInstance(
  context: ActionsClientContext,
  getAxiosParams: GetAxiosParams
): Promise<AxiosInstance> {
  const { actionId } = getAxiosParams;

  return context.actionExecutor.getAxiosInstance({
    actionId,
    request: context.request,
  });
}
