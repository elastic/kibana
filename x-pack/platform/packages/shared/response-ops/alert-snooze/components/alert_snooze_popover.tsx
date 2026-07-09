/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiContextMenuItem,
  EuiHorizontalRule,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { SnoozeFormBody } from './snooze_form_body';
import { useSnoozeForm } from './use_snooze_form';
import type { AlertSnoozePayload } from './use_snooze_form';
import type { DataConditionTypeDescriptor } from './types';
import * as i18n from './translations';

export type { AlertSnoozePayload } from './use_snooze_form';

export interface AlertSnoozePopoverProps {
  onApply: (payload: AlertSnoozePayload) => void;
  dataConditionTypes?: readonly DataConditionTypeDescriptor[];
}

export const AlertSnoozePopover = ({ onApply, dataConditionTypes }: AlertSnoozePopoverProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const togglePopover = useCallback(() => setIsOpen((open) => !open), []);
  const closePopover = useCallback(() => setIsOpen(false), []);

  const {
    activeTab,
    setActiveTab,
    setQuickEndDate,
    setConditionalSchedule,
    isApplyDisabled,
    applySnooze,
  } = useSnoozeForm(onApply);

  const handleApply = useCallback(() => {
    if (applySnooze()) closePopover();
  }, [applySnooze, closePopover]);

  const triggerElement = useMemo(() => {
    return (
      <EuiContextMenuItem onClick={togglePopover} data-test-subj="alertSnoozePopoverTrigger">
        {i18n.SNOOZE_TRIGGER_BUTTON}
      </EuiContextMenuItem>
    );
  }, [togglePopover]);

  return (
    <EuiPopover
      aria-label={i18n.PANEL_TITLE}
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

      <SnoozeFormBody
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onQuickScheduleChange={setQuickEndDate}
        onConditionalScheduleChange={setConditionalSchedule}
        dataConditionTypes={dataConditionTypes}
      />

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
