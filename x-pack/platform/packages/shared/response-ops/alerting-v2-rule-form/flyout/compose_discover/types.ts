/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ComposeDiscoverMode = 'create' | 'edit';

export type QueryTab = 'base' | 'alert' | 'recovery';

/**
 * Describes which tabs the Discover Sandbox should show.
 * Always `{ type: 'single' }` for now — tabs (Base/Alert/Recovery) are added in the
 * custom recovery follow-up PR.
 */
export interface SandboxTabConfig {
  type: 'single';
}

/**
 * UI-only state for the ComposeDiscover flyout.
 *
 * This reducer manages navigation and Sandbox state only.
 * All form values (name, schedule, query fields, delays, etc.) live in
 * useForm<FormValues>() via RHF and are never stored here.
 */
export interface ComposeDiscoverState {
  mode: ComposeDiscoverMode;
  step: number;
  /** The live query in the Sandbox editor — committed to FormValues on "Apply changes". */
  fullQuery: string;
  activeTab: QueryTab;
  childOpen: boolean;
  queryCommitted: boolean;
  /** Date range for the Discover Sandbox preview window — persists across open/close.
   *  Intentionally NOT connected to FormValues.schedule.lookback. */
  sandboxDateStart: string;
  sandboxDateEnd: string;
}

export type ComposeDiscoverAction =
  | { type: 'SET_FULL_QUERY'; query: string }
  | { type: 'SET_TAB'; tab: QueryTab }
  | { type: 'SET_STEP'; step: number }
  | { type: 'GO_NEXT' }
  | { type: 'GO_BACK' }
  | { type: 'SET_SANDBOX_DATE_RANGE'; start: string; end: string }
  | { type: 'OPEN_CHILD' }
  | { type: 'OPEN_CHILD_FOR_STEP'; step: number }
  | { type: 'CLOSE_CHILD' }
  | { type: 'COMMIT_CHILD_QUERY'; fullQuery: string };
