/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { QuickSnoozePanel } from './quick_snooze_panel';
import * as i18n from './translations';

export interface QuickSnoozePopoverProps {
  onApplySnooze: (schedule: string | null) => void;
  'data-test-subj'?: string;
}

export const QuickSnoozePopover = ({
  onApplySnooze,
  'data-test-subj': dataTestSubj = 'quickSnoozePopover',
}: QuickSnoozePopoverProps) => {
  const [pendingSchedule, setPendingSchedule] = useState<string | null | undefined>(undefined);
  const isApplyDisabled = pendingSchedule === undefined;

  const handleApply = useCallback(() => {
    if (pendingSchedule === undefined) {
      return;
    }

    onApplySnooze(pendingSchedule);
  }, [onApplySnooze, pendingSchedule]);

  return (
    <EuiPanel paddingSize="m" data-test-subj={dataTestSubj}>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="bellSlash" aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>{i18n.PANEL_TITLE}</h3>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        <p>{i18n.QUICK_SNOOZE_POPOVER_SUBTITLE}</p>
      </EuiText>
      <EuiHorizontalRule margin="m" />
      <QuickSnoozePanel onScheduleChange={setPendingSchedule} />
      <EuiButton
        iconType="bellSlash"
        size="s"
        onClick={handleApply}
        isDisabled={isApplyDisabled}
        fullWidth
      >
        {i18n.QUICK_SNOOZE_POPOVER_APPLY}
      </EuiButton>
    </EuiPanel>
  );
};
