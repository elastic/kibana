/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ComposeDiscoverMode = 'create' | 'edit';

export type QueryTab = 'base' | 'alert' | 'recovery';
export type DelayMode = 'immediate' | 'breaches' | 'duration';

/**
 * Describes which tabs the Discover Sandbox should show.
 * Always `{ type: 'single' }` for now — tabs (Base/Alert/Recovery) are added in the
 * custom recovery follow-up PR.
 */
export type SandboxTabConfig = { type: 'single' };

export interface ComposeDiscoverState {
  mode: ComposeDiscoverMode;
  step: number;
  fullQuery: string;
  notificationsEnabled: boolean;
  // Form value fields — migrated to RHF useForm<FormValues> in this PR
  name: string;
  tags: string[];
  schedule: string;
  lookback: string;
  timeField: string;
  groupFields: string[];
  alertDelayMode: DelayMode;
  alertDelayValue: number;
  recoveryDelayMode: DelayMode;
  recoveryDelayValue: number;
  activeTab: QueryTab;
  yamlMode: boolean;
  childOpen: boolean;
  queryCommitted: boolean;
  /** Date range for the Discover Sandbox preview window — persists across open/close */
  sandboxDateStart: string;
  sandboxDateEnd: string;
}

export type ComposeDiscoverAction =
  | { type: 'SET_NAME'; name: string }
  | { type: 'SET_TAGS'; tags: string[] }
  | { type: 'SET_FULL_QUERY'; query: string }
  | { type: 'SET_TAB'; tab: QueryTab }
  | { type: 'SET_SCHEDULE'; schedule: string }
  | { type: 'SET_LOOKBACK'; lookback: string }
  | { type: 'SET_TIME_FIELD'; timeField: string }
  | { type: 'SET_GROUP_FIELDS'; fields: string[] }
  | { type: 'SET_ALERT_DELAY_MODE'; mode: DelayMode }
  | { type: 'SET_ALERT_DELAY_VALUE'; value: number }
  | { type: 'SET_RECOVERY_DELAY_MODE'; mode: DelayMode }
  | { type: 'SET_RECOVERY_DELAY_VALUE'; value: number }
  | { type: 'SET_YAML_MODE'; enabled: boolean }
  | { type: 'SET_STEP'; step: number }
  | { type: 'GO_NEXT' }
  | { type: 'GO_BACK' }
  | { type: 'SET_NOTIFICATIONS_ENABLED'; enabled: boolean }
  | { type: 'SET_SANDBOX_DATE_RANGE'; start: string; end: string }
  | { type: 'OPEN_CHILD' }
  | { type: 'OPEN_CHILD_FOR_STEP'; step: number }
  | { type: 'CLOSE_CHILD' }
  | { type: 'COMMIT_CHILD_QUERY'; fullQuery: string };
