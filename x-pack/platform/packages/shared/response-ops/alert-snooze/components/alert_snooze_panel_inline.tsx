/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiButtonEmpty, EuiHorizontalRule, useEuiTheme } from '@elastic/eui';
import { SnoozeFormBody } from './snooze_form_body';
import { useSnoozeForm } from './use_snooze_form';
import type { AlertSnoozePayload } from './use_snooze_form';
import type { DataConditionTypeDescriptor } from './types';
import * as i18n from './translations';

export interface AlertSnoozePanelInlineProps {
  onApply: (payload: AlertSnoozePayload) => void;
  onBack: () => void;
  dataConditionTypes?: readonly DataConditionTypeDescriptor[];
}

/**
 * The snooze form rendered inline inside the row actions popover, with a back
 * button that returns the user to the actions menu. Shares the same form logic
 * (`useSnoozeForm`) and body (`SnoozeFormBody`) as AlertSnoozePopover but without
 * its own EuiPopover wrapper.
 *
 * The hosting popover panel is the scroll container (it sets maxHeight +
 * overflowY:auto via panelStyle, so popper keeps it inside the viewport). The
 * header and footer here use position:sticky so they stay pinned while the form
 * body scrolls between them.
 */
export const AlertSnoozePanelInline = ({
  onApply,
  onBack,
  dataConditionTypes,
}: AlertSnoozePanelInlineProps) => {
  const { euiTheme } = useEuiTheme();
  const {
    activeTab,
    setActiveTab,
    setQuickEndDate,
    setConditionalSchedule,
    isApplyDisabled,
    applySnooze,
  } = useSnoozeForm(onApply);

  const stickyHeaderStyle: React.CSSProperties = {
    position: 'sticky',
    top: 0,
    zIndex: Number(euiTheme.levels.content) + 1,
    background: euiTheme.colors.emptyShade,
  };
  const stickyFooterStyle: React.CSSProperties = {
    position: 'sticky',
    bottom: 0,
    zIndex: Number(euiTheme.levels.content) + 1,
    background: euiTheme.colors.emptyShade,
    padding: '8px',
  };

  return (
    <>
      {/* Sticky header — stays at the top of the scrollable popover panel */}
      <div style={stickyHeaderStyle} data-test-subj="alertSnoozePanel">
        <EuiButtonEmpty
          iconType="arrowLeft"
          onClick={onBack}
          size="s"
          flush="left"
          data-test-subj="alertSnoozePanelBack"
        >
          {i18n.SNOOZE_TRIGGER_BUTTON}
        </EuiButtonEmpty>
        <EuiHorizontalRule margin="none" />
      </div>

      {/* Scrollable form body */}
      <SnoozeFormBody
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onQuickScheduleChange={setQuickEndDate}
        onConditionalScheduleChange={setConditionalSchedule}
        dataConditionTypes={dataConditionTypes}
      />

      {/* Sticky footer — keeps the apply button pinned at the bottom */}
      <div style={stickyFooterStyle}>
        <EuiHorizontalRule margin="none" />
        <div style={{ padding: '8px 0 0' }}>
          <EuiButton
            fill
            fullWidth
            size="s"
            isDisabled={isApplyDisabled}
            onClick={() => applySnooze()}
            data-test-subj="alertSnoozeApplyButton"
            iconType="bellSlash"
          >
            {i18n.SNOOZE_ALERT_BUTTON}
          </EuiButton>
        </div>
      </div>
    </>
  );
};
