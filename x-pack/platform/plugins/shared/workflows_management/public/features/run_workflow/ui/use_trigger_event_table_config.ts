/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useTriggerEventTableConfig as useTriggerEventTableConfigFromModule } from './trigger_event_table_config';
import type {
  UseTriggerEventTableConfigOptions,
  UseTriggerEventTableConfigResult,
} from './trigger_event_table_config_types';

export type {
  UseTriggerEventTableConfigOptions,
  UseTriggerEventTableConfigResult,
} from './trigger_event_table_config_types';

export type UseTriggerEventTableConfigFn = (
  options: UseTriggerEventTableConfigOptions
) => UseTriggerEventTableConfigResult;

export const useTriggerEventTableConfig =
  useTriggerEventTableConfigFromModule as UseTriggerEventTableConfigFn;
