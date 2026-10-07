/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ACTION_TYPE_SOURCES } from '@kbn/actions-types';
import type { ActionType } from '../../types';

export function isConnectorTypeTestable(actionType: ActionType | undefined): boolean {
  if (!actionType) {
    return false;
  }

  if (actionType.source === ACTION_TYPE_SOURCES.spec) {
    return Boolean(actionType.isTestable);
  }

  return Boolean(
    actionType.isTestable || !actionType.source || actionType.source === ACTION_TYPE_SOURCES.stack
  );
}
