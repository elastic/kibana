/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TEST_CONNECTOR_SUB_ACTION } from '@kbn/connector-specs';
import { ACTION_TYPE_SOURCES } from '@kbn/actions-types';
import type { ActionType } from '../../types';

export function getSpecConnectorTestExecutionParams(
  actionType: ActionType | undefined,
  params: Record<string, unknown>
): Record<string, unknown> {
  if (actionType?.source !== ACTION_TYPE_SOURCES.spec || !actionType.testable || params.subAction) {
    return params;
  }

  return {
    ...params,
    subAction: TEST_CONNECTOR_SUB_ACTION,
    subActionParams: params.subActionParams ?? {},
  };
}
