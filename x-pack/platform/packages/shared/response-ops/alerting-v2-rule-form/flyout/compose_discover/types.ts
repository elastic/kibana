/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { RuleFormServices } from '../../form/contexts/rule_form_context';
import type { ComposeFormValues } from './compose_form_types';

export type ComposeDiscoverMode = 'create' | 'edit' | 'clone';

export type RecoveryType = 'default' | 'custom' | 'none';

export type QueryTab = 'base' | 'alert' | 'recovery';

export type StepId = 'alertCondition' | 'recoveryCondition' | 'details' | 'notifications';

/**
 * Editing buffer for the Sandbox flyout. Lives in the parent hook (`useSandboxDraft`),
 * above the Sandbox child, so edits persist across open/close cycles.
 * Date range is intentionally not connected to schedule.lookback — it is a
 * preview window for testing the query, not a rule configuration field.
 */
export interface SandboxDraft {
  base: string;
  breach: string;
  recover: string;
  dateStart: string;
  dateEnd: string;
}

export interface StepRenderProps {
  state: ComposeDiscoverState;
  dispatch: React.Dispatch<ComposeDiscoverAction>;
  services: RuleFormServices;
  /** Called when the user changes the recovery type selector. */
  onRecoveryTypeChange: (type: RecoveryType) => void;
}

export interface StepDefinition {
  id: StepId;
  title: string;
  render: (props: StepRenderProps) => React.ReactNode;
  validate?: (
    methods: UseFormReturn<ComposeFormValues>,
    state: ComposeDiscoverState
  ) => Promise<boolean> | boolean;
}

/**
 * Describes which tabs the Discover Sandbox should show.
 * Computed from state by getSandboxTabConfig().
 *
 * - 'single'        — no tracking; single editor
 * - 'base-alert'    — tracking on, Alert Condition step: locked base above editable alert block
 * - 'base-recovery' — tracking on, Recovery Condition step: locked base above editable recovery block
 */
export type SandboxTabConfig =
  | { type: 'single' }
  | { type: 'base-alert' }
  | { type: 'base-recovery' };

/**
 * UI-only state for the ComposeDiscover flyout.
 *
 * Query content lives in RHF (committed state) and the SandboxDraft hook (editing buffer).
 * This reducer owns navigation, Sandbox open/close, tab selection, and mode flags only —
 * no query strings are stored here.
 */
export interface ComposeDiscoverState {
  mode: ComposeDiscoverMode;
  step: number;
  /**
   * When false: a single editor is shown.
   * When true: the query is split into base + breach block, with an optional recovery block.
   */
  tracking: boolean;
  /** How recovery is detected. 'default' = invert alert block; 'custom' = separate recovery block. */
  recoveryType: RecoveryType;
  activeTab: QueryTab;
  childOpen: boolean;
  queryCommitted: boolean;
  /** When true the stepped form is replaced by a full YAML editor. */
  yamlMode: boolean;
}

export type ComposeDiscoverAction =
  | { type: 'SET_RECOVERY_TYPE'; recoveryType: RecoveryType }
  | { type: 'ENABLE_TRACKING' }
  | { type: 'DISABLE_TRACKING' }
  | { type: 'SET_TAB'; tab: QueryTab }
  | { type: 'SET_STEP'; step: number }
  | { type: 'GO_NEXT' }
  | { type: 'GO_BACK' }
  | { type: 'OPEN_CHILD' }
  | { type: 'OPEN_CHILD_FOR_STEP'; step: number }
  | { type: 'CLOSE_CHILD' }
  | { type: 'COMMIT_QUERY' }
  | { type: 'SET_YAML_MODE'; enabled: boolean };
