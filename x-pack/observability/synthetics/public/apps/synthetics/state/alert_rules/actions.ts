/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import { createAsyncAction } from '../utils/actions';

export const getDefaultAlertingAction = createAsyncAction<
  void,
  { statusRule: Rule; tlsRule: Rule }
>('getDefaultAlertingAction');

export const enableDefaultAlertingAction = createAsyncAction<
  void,
  { statusRule: Rule; tlsRule: Rule }
>('enableDefaultAlertingAction');

export const enableDefaultAlertingSilentlyAction = createAsyncAction<
  void,
  { statusRule: Rule; tlsRule: Rule }
>('enableDefaultAlertingSilentlyAction');

export const updateDefaultAlertingAction = createAsyncAction<void, Rule>(
  'updateDefaultAlertingAction'
);
