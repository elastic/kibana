/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TestConnectorParams } from '../../../../lib/action_executor';
import type { ActionsClientContext } from '../../../../actions_client';

export async function testConnector(
  context: ActionsClientContext,
  testConnectorParams: TestConnectorParams
) {
  const { actionId } = testConnectorParams;

  await context.actionExecutor.testConnector({
    actionId,
    request: context.request,
  });
}
