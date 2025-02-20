/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONNECTORS_TAB, QUICK_PROMPTS_TAB, SYSTEM_PROMPTS_TAB } from './const';

export type BaseSettingsTabs = typeof QUICK_PROMPTS_TAB | typeof SYSTEM_PROMPTS_TAB;

export type AdditionalSettingsTabs = typeof CONNECTORS_TAB;

export type SettingsTabs = BaseSettingsTabs | AdditionalSettingsTabs;
