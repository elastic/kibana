/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonGroup,
  EuiContextMenuItem,
  EuiHorizontalRule,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { QuickSnoozePanel } from './quick_snooze_panel';
import { ConditionalSnoozePanel } from './conditional_snooze_panel';
import type {
  ConditionalSnoozeSchedule,
  DataConditionTypeDescriptor,
  SnoozePanelTab,
} from './types';
import * as i18n from './translations';

export type AlertSnoozePayload = ConditionalSnoozeSchedule;

export interface AlertSnoozePopoverProps {
  onApply: (payload: AlertSnoozePayload) => void;
  dataConditionTypes?: readonly DataConditionTypeDescriptor[];
}

const TAB_OPTIONS: Array<{ id: SnoozePanelTab; label: string }> = [
  { id: 'quick', label: i18n.QUICK_SNOOZE_TAB },
  { id: 'conditional', label: i18n.CONDITIONAL_SNOOZE_TAB },
];

export const AlertSnoozePopover = ({ onApply, dataConditionTypes }: AlertSnoozePopoverProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SnoozePanelTab>('quick');

  // `undefined` = invalid / nothing to apply, `null` = indefinite, string = ISO end date.
  const [quickEndDate, setQuickEndDate] = useState<string | null | undefined>(undefined);
  const [conditionalSchedule, setConditionalSchedule] = useState<
    ConditionalSnoozeSchedule | undefined
  >(undefined);

  const togglePopover = useCallback(() => setIsOpen((open) => !open), []);
  const closePopover = useCallback(() => setIsOpen(false), []);

  const isApplyDisabled =
    activeTab === 'quick' ? quickEndDate === undefined : conditionalSchedule === undefined;

  const handleApply = useCallback(() => {
    if (activeTab === 'quick') {
      if (quickEndDate === undefined) return;
      onApply({ expiresAt: quickEndDate });
    } else {
      if (conditionalSchedule === undefined) return;
      onApply(conditionalSchedule);
    }
    closePopover();
  }, [activeTab, quickEndDate, conditionalSchedule, onApply, closePopover]);

  const triggerElement = useMemo(() => {
    return (
      <EuiContextMenuItem onClick={togglePopover} data-test-subj="alertSnoozePopoverTrigger">
        {i18n.SNOOZE_TRIGGER_BUTTON}
      </EuiContextMenuItem>
    );
  }, [togglePopover]);

  return (
    <EuiPopover
      button={triggerElement}
      isOpen={isOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downRight"
      display="block"
      data-test-subj="alertSnoozePopover"
    >
      <EuiPopoverTitle paddingSize="m">
        <EuiText size="s">
          <strong>{i18n.PANEL_TITLE}</strong>
        </EuiText>
        <EuiSpacer size="xs" />
        <EuiText size="xs" color="subdued">
          {i18n.PANEL_SUBTITLE}
        </EuiText>
      </EuiPopoverTitle>

      <div style={{ width: 480, padding: '12px 16px 0' }}>
        <EuiButtonGroup
          legend={i18n.SNOOZE_TYPE_LEGEND}
          options={TAB_OPTIONS.map(({ id, label }) => ({ id, label }))}
          idSelected={activeTab}
          onChange={(id) => setActiveTab(id as SnoozePanelTab)}
          isFullWidth
          data-test-subj="alertSnoozeTabs"
        />
        <EuiSpacer size="m" />

        {activeTab === 'quick' && <QuickSnoozePanel onScheduleChange={setQuickEndDate} />}
        {activeTab === 'conditional' && (
          <ConditionalSnoozePanel
            onScheduleChange={setConditionalSchedule}
            dataConditionTypes={dataConditionTypes}
          />
        )}
      </div>

      <EuiHorizontalRule margin="none" />
      <EuiPopoverFooter paddingSize="s">
        <EuiButton
          fill
          fullWidth
          size="s"
          isDisabled={isApplyDisabled}
          onClick={handleApply}
          data-test-subj="alertSnoozeApplyButton"
        >
          {i18n.SNOOZE_ALERT_BUTTON}
        </EuiButton>
      </EuiPopoverFooter>
    </EuiPopover>
  );
};
