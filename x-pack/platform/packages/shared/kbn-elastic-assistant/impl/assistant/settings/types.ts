/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type ANONYMIZATION_TAB,
  type CONNECTORS_TAB,
  type CONVERSATIONS_TAB,
  type EVALUATION_TAB,
  type KNOWLEDGE_BASE_TAB,
  type QUICK_PROMPTS_TAB,
  type SYSTEM_PROMPTS_TAB,
} from './const';

export type BaseSettingsTabs =
  | typeof CONVERSATIONS_TAB
  | typeof QUICK_PROMPTS_TAB
  | typeof SYSTEM_PROMPTS_TAB
  | typeof ANONYMIZATION_TAB
  | typeof KNOWLEDGE_BASE_TAB
  | typeof EVALUATION_TAB;

export type AdditionalSettingsTabs = typeof CONNECTORS_TAB;

export type SettingsTabs = BaseSettingsTabs | AdditionalSettingsTabs;
