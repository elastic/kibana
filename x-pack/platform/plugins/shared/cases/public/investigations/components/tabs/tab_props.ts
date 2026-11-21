/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationRecord } from '../../../../common/investigations/types';

export type TabId = 'overview' | 'conversation' | 'evidence' | 'scope' | 'procedure' | 'activity';

export const TAB_IDS: readonly TabId[] = [
  'overview',
  'conversation',
  'evidence',
  'scope',
  'procedure',
  'activity',
] as const;

export const isTabId = (value: unknown): value is TabId =>
  typeof value === 'string' && TAB_IDS.some((tabId) => tabId === value);

export interface TabProps {
  record: InvestigationRecord;
  /** Whether the current user may use the agent on this record. */
  agentAvailable: boolean;
  onNavigateTab: (tab: TabId, opts?: { itemId?: string }) => void;
  /** The item opened through the `item` query parameter, if any. */
  openItemId?: string;
}
