/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reduceSnoozed } from './snoozed';
import { reduceMuted } from './muted';
import { reduceActiveMaintenanceWindow } from './maintenance_window';
import { reduceInvalidActionGroup } from './invalid_action_group';
import { reducePendingRecovered } from './pending_recovery';
import { reduceSummarized } from './summarized';
import { reduceActionGroup } from './action_group';
import { reduceNotifyWhen } from './notify_when';

export const reducers = [
  reduceInvalidActionGroup,
  reduceSnoozed,
  reduceMuted,
  reduceActiveMaintenanceWindow,
] as const;

export const actionReducers = [
  reduceActionGroup,
  reducePendingRecovered,
  reduceSummarized,
  reduceNotifyWhen,
] as const;
