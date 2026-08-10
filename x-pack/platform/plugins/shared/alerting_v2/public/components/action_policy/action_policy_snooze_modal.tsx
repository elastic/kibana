/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  PANEL_TITLE,
  QUICK_SNOOZE_POPOVER_APPLY,
  QuickSnoozePanel,
  type QuickSnoozePanelMessages,
} from '@kbn/response-ops-alert-snooze';
import React, { useState } from 'react';

// The shared panel is worded for alerts; action policies snooze notifications.
const SNOOZE_PANEL_MESSAGES = {
  durationQuestion: i18n.translate('xpack.alertingV2.actionPolicy.snoozeModal.durationQuestion', {
    defaultMessage: 'How long should notifications be snoozed?',
  }),
  getUnsnoozeOnDateMessage: (date) =>
    i18n.translate('xpack.alertingV2.actionPolicy.snoozeModal.unsnoozeOnDate', {
      defaultMessage: 'Notifications will resume on {date}',
      values: { date },
    }),
} satisfies Partial<QuickSnoozePanelMessages>;

// The shared subtitle advertises conditions and indefinite snoozing, neither of
// which this modal offers.
const SUBTITLE = i18n.translate('xpack.alertingV2.actionPolicy.snoozeModal.subtitle', {
  defaultMessage: 'Silence notifications until the chosen time.',
});

interface ActionPolicySnoozeModalProps {
  title?: string;
  onApplySnooze: (snoozedUntil: string) => void;
  onCancel: () => void;
}

/** Snooze duration picker shown when snoozing one or several action policies. */
export const ActionPolicySnoozeModal = ({
  title = PANEL_TITLE,
  onApplySnooze,
  onCancel,
}: ActionPolicySnoozeModalProps) => {
  const modalTitleId = useGeneratedHtmlId();
  // The action policy snooze API requires an end date, so the panel is rendered
  // without the "Indefinitely" option and never reports a null schedule.
  const [snoozedUntil, setSnoozedUntil] = useState<string | undefined>();

  return (
    <EuiModal
      onClose={onCancel}
      aria-labelledby={modalTitleId}
      data-test-subj="actionPolicySnoozeModal"
    >
      <EuiModalHeader>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="bellSlash" aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiModalHeaderTitle id={modalTitleId}>{title}</EuiModalHeaderTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="xs" color="subdued">
          <p>{SUBTITLE}</p>
        </EuiText>
        <EuiHorizontalRule margin="m" />
        <QuickSnoozePanel
          hideIndefinite
          messages={SNOOZE_PANEL_MESSAGES}
          onScheduleChange={(endDate) => setSnoozedUntil(endDate ?? undefined)}
        />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty data-test-subj="actionPolicySnoozeModalCancel" onClick={onCancel}>
          {i18n.translate('xpack.alertingV2.actionPolicy.snoozeModal.cancel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton
          fill
          data-test-subj="actionPolicySnoozeModalApply"
          isDisabled={!snoozedUntil}
          onClick={() => {
            if (snoozedUntil) onApplySnooze(snoozedUntil);
          }}
        >
          {QUICK_SNOOZE_POPOVER_APPLY}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
