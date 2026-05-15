/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { RuleFormServices } from '../../form/contexts/rule_form_context';
import type { FormValues } from '../../form/types';

export type ComposeDiscoverMode = 'create' | 'edit';

export type RecoveryType = 'default' | 'custom' | 'none';

export type QueryTab = 'base' | 'alert' | 'recovery';

export type StepId = 'alertCondition' | 'recoveryCondition' | 'details' | 'notifications';

export interface StepRenderProps {
  state: ComposeDiscoverState;
  dispatch: React.Dispatch<ComposeDiscoverAction>;
  services: RuleFormServices;
}

export interface StepDefinition {
  id: StepId;
  title: string;
  render: (props: StepRenderProps) => React.ReactNode;
  validate?: (
    methods: UseFormReturn<FormValues>,
    state: ComposeDiscoverState
  ) => Promise<boolean> | boolean;
}

/**
 * Describes which tabs the Discover Sandbox should show.
 * Computed from state by getSandboxTabConfig().
 *
 * - 'single'        — no tracking; single editor with fullQuery
 * - 'base-alert'    — tracking on, Alert Condition step: locked base above editable alert block
 * - 'base-recovery' — tracking on, Recovery Condition step: locked base above editable recovery block
 */
export type SandboxTabConfig =
  | { type: 'single' }
  | { type: 'base-alert' }
  | { type: 'base-recovery' };

/**
 * Data passed from the Sandbox child to the flyout parent on "Apply changes".
 * The flyout writes these values into RHF (the source of truth) and updates
 * the reducer cache.
 */
export interface SandboxApplyData {
  isSplit: boolean;
  fullQuery: string;
  baseQuery: string;
  alertBlock: string;
  recoveryBlock: string;
}

/**
 * UI-only state for the ComposeDiscover flyout.
 *
 * This reducer manages navigation, Sandbox state, and split-query cache.
 * All form values (name, schedule, delays, etc.) live in useForm<FormValues>()
 * via RHF and are never stored here. The query/split fields are a write-through
 * cache: written imperatively alongside RHF at Apply time. RHF is the source
 * of truth — these fields exist so the form view can display query summaries
 * without subscribing to RHF watchers.
 */
export interface ComposeDiscoverState {
  mode: ComposeDiscoverMode;
  step: number;
  /**
   * When false: a single fullQuery editor is shown.
   * When true: the query is split into baseQuery + alertBlock, with an optional
   * recoveryBlock for custom recovery. The Sandbox shows a tab bar.
   */
  tracking: boolean;
  /** Full (unsplit) query — used when tracking is disabled. */
  fullQuery: string;
  /** Base portion of the split query (FROM … | STATS …) — used when tracking is enabled. */
  baseQuery: string;
  /** Alert condition block (| WHERE …) — used when tracking is enabled. */
  alertBlock: string;
  /** Recovery condition block — used when tracking + custom recovery are enabled. */
  recoveryBlock: string;
  /** How recovery is detected. 'default' = invert the alert block; 'custom' = recoveryBlock. */
  recoveryType: RecoveryType;
  activeTab: QueryTab;
  childOpen: boolean;
  queryCommitted: boolean;
  /** Date range for the Discover Sandbox preview window — persists across open/close.
   *  Intentionally NOT connected to FormValues.schedule.lookback. */
  sandboxDateStart: string;
  sandboxDateEnd: string;
  /** When true the stepped form is replaced by a full YAML editor. */
  yamlMode: boolean;
}

export type ComposeDiscoverAction =
  | { type: 'SET_FULL_QUERY'; query: string }
  | { type: 'SET_RECOVERY_TYPE'; recoveryType: RecoveryType }
  | { type: 'ENABLE_TRACKING'; base: string; alertBlock: string }
  | { type: 'DISABLE_TRACKING' }
  | { type: 'SET_TAB'; tab: QueryTab }
  | { type: 'SET_STEP'; step: number }
  | { type: 'GO_NEXT' }
  | { type: 'GO_BACK' }
  | { type: 'SET_SANDBOX_DATE_RANGE'; start: string; end: string }
  | { type: 'OPEN_CHILD' }
  | { type: 'OPEN_CHILD_FOR_STEP'; step: number }
  | { type: 'CLOSE_CHILD' }
  | { type: 'COMMIT_CHILD_QUERY'; fullQuery: string }
  | { type: 'COMMIT_CHILD_SPLIT'; baseQuery: string; alertBlock: string; recoveryBlock: string }
  | { type: 'SET_YAML_MODE'; enabled: boolean };
