/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ComposeDiscoverMode = 'create' | 'edit';

/** 'no-recovery' disables recovery alerts. Not yet wired to the API — shown as disabled in the UI. */
export type RecoveryType = 'default' | 'no-recovery' | 'custom';

export type QueryTab = 'base' | 'alert' | 'recovery';
export type DelayMode = 'immediate' | 'breaches' | 'duration';

/**
 * Describes which tabs the Discover Sandbox should show for the current step and context.
 * Computed from state by getSandboxTabConfig().
 *
 * - single:        No tracking enabled — one query editor, no tabs
 * - base-alert:    Tracking on, Alert Condition step — Base query + Alert query tabs
 * - base-recovery: Recovery Condition step with custom recovery — Recovery query tab only
 * - all-three:     YAML mode — all three tabs always visible
 */
export type SandboxTabConfig =
  | { type: 'single' }
  | { type: 'base-alert' }
  | { type: 'base-recovery' }
  | { type: 'all-three' };

export interface ComposeDiscoverState {
  mode: ComposeDiscoverMode;
  step: number;
  tracking: boolean;
  fullQuery: string;
  baseQuery: string;
  alertBlock: string;
  recoveryBlock: string;
  recoveryType: RecoveryType;
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
}

export type ComposeDiscoverAction =
  | { type: 'SET_NAME'; name: string }
  | { type: 'SET_TAGS'; tags: string[] }
  | { type: 'SET_FULL_QUERY'; query: string }
  | { type: 'SET_BASE_QUERY'; query: string }
  | { type: 'SET_ALERT_BLOCK'; block: string }
  | { type: 'SET_RECOVERY_BLOCK'; block: string }
  | { type: 'SET_RECOVERY_TYPE'; recoveryType: RecoveryType }
  | { type: 'ENABLE_TRACKING'; base: string; alertBlock: string }
  | { type: 'DISABLE_TRACKING' }
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
  | { type: 'OPEN_CHILD' }
  | { type: 'OPEN_CHILD_FOR_STEP'; step: number }
  | { type: 'CLOSE_CHILD' }
  | { type: 'COMMIT_CHILD_QUERY'; fullQuery: string }
  | {
      type: 'COMMIT_CHILD_SPLIT';
      baseQuery: string;
      alertBlock: string;
      recoveryBlock: string;
    };
