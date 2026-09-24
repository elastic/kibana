/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TEST_CONNECTOR_SUB_ACTION } from '@kbn/connector-specs';

export function getSpecConnectorTestExecutionParams(
  params: Record<string, unknown>,
  { isSpec, isTestable }: { isSpec: boolean; isTestable: boolean }
): Record<string, unknown> {
  if (!isSpec || !isTestable || params.subAction) {
    return params;
  }

  return {
    ...params,
    subAction: TEST_CONNECTOR_SUB_ACTION,
    subActionParams: params.subActionParams ?? {},
  };
}
