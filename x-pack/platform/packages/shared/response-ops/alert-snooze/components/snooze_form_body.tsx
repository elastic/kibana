/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonGroup, EuiSpacer } from '@elastic/eui';
import { QuickSnoozePanel } from './quick_snooze_panel';
import { ConditionalSnoozePanel } from './conditional_snooze_panel';
import type {
  ConditionalSnoozeSchedule,
  DataConditionTypeDescriptor,
  SnoozePanelTab,
} from './types';
import * as i18n from './translations';

/** Fixed width so the panel doesn't resize when switching between tabs. */
export const SNOOZE_PANEL_WIDTH = 480;

const TAB_OPTIONS: Array<{ id: SnoozePanelTab; label: string }> = [
  { id: 'quick', label: i18n.QUICK_SNOOZE_TAB },
  { id: 'conditional', label: i18n.CONDITIONAL_SNOOZE_TAB },
];

export interface SnoozeFormBodyProps {
  activeTab: SnoozePanelTab;
  onTabChange: (tab: SnoozePanelTab) => void;
  onQuickScheduleChange: (endDate: string | null | undefined) => void;
  onConditionalScheduleChange: (schedule: ConditionalSnoozeSchedule | undefined) => void;
  dataConditionTypes?: readonly DataConditionTypeDescriptor[];
}

/**
 * The tabbed snooze form body (Quick / Condition-based) shared by
 * `AlertSnoozePopover` and `AlertSnoozePanelInline`. It is purely presentational;
 * form state lives in `useSnoozeForm`.
 */
export const SnoozeFormBody = ({
  activeTab,
  onTabChange,
  onQuickScheduleChange,
  onConditionalScheduleChange,
  dataConditionTypes,
}: SnoozeFormBodyProps) => (
  <div style={{ width: SNOOZE_PANEL_WIDTH, padding: '12px 16px 0' }}>
    <EuiButtonGroup
      legend={i18n.SNOOZE_TYPE_LEGEND}
      options={TAB_OPTIONS.map(({ id, label }) => ({ id, label }))}
      idSelected={activeTab}
      onChange={(id) => onTabChange(id as SnoozePanelTab)}
      isFullWidth
      data-test-subj="alertSnoozeTabs"
    />
    <EuiSpacer size="m" />

    {activeTab === 'quick' && <QuickSnoozePanel onScheduleChange={onQuickScheduleChange} />}
    {activeTab === 'conditional' && (
      <ConditionalSnoozePanel
        onScheduleChange={onConditionalScheduleChange}
        dataConditionTypes={dataConditionTypes}
      />
    )}
  </div>
);
