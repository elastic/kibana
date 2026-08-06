/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionType } from '../../../types';

export const isActionTypeCreatable = (
  actionType: Pick<ActionType, 'enabledInConfig' | 'isDeprecated' | 'isCreateDisabled'> | undefined
): boolean =>
  actionType?.enabledInConfig === true && !actionType.isDeprecated && !actionType.isCreateDisabled;
