/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
} from '@elastic/eui';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import { toMountPoint } from '@kbn/react-kibana-mount';
import {
  PANEL_TITLE,
  QUICK_SNOOZE_POPOVER_APPLY,
  QuickSnoozePanel,
  ConditionalSnoozePanel,
  type ConditionalSnoozeSchedule,
} from '@kbn/response-ops-alert-snooze';
import * as i18n from '../actions/translations';

export type SnoozeExpiryModalResult = ConditionalSnoozeSchedule;

type SnoozeTab = 'quick' | 'conditional';

const TAB_OPTIONS: Array<{ id: SnoozeTab; label: string; 'data-test-subj': string }> = [
  { id: 'quick', label: i18n.QUICK_SNOOZE_TAB, 'data-test-subj': 'snoozeTab-quick' },
  {
    id: 'conditional',
    label: i18n.CONDITIONAL_SNOOZE_TAB,
    'data-test-subj': 'snoozeTab-conditional',
  },
];

interface SnoozeExpiryModalProps {
  onConfirm: (schedule: SnoozeExpiryModalResult) => void;
  onCancel: () => void;
  /** `data.*` fields offered by the condition-based tab's `field_change` dropdown. */
  fieldOptions?: string[];
}

/** Snooze form with Quick and Condition-based tabs, each producing a ConditionalSnoozeSchedule. */
const SnoozeExpiryModal = ({ onConfirm, onCancel, fieldOptions }: SnoozeExpiryModalProps) => {
  const [activeTab, setActiveTab] = useState<SnoozeTab>('quick');
  // `undefined` = nothing valid to apply, `null` = indefinite, string = ISO end date.
  const [quickEndDate, setQuickEndDate] = useState<string | null | undefined>(undefined);
  const [conditionalSchedule, setConditionalSchedule] = useState<
    ConditionalSnoozeSchedule | undefined
  >(undefined);

  const pendingSchedule = useMemo<ConditionalSnoozeSchedule | undefined>(() => {
    if (activeTab === 'quick') {
      return quickEndDate === undefined ? undefined : { expiresAt: quickEndDate };
    }
    return conditionalSchedule;
  }, [activeTab, quickEndDate, conditionalSchedule]);

  const isConfirmDisabled = pendingSchedule === undefined;

  return (
    <EuiModal
      onClose={onCancel}
      aria-labelledby="snoozeExpiryModalTitle"
      data-test-subj="snoozeExpiryModal"
    >
      <EuiModalHeader>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="bellSlash" aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiModalHeaderTitle id="snoozeExpiryModalTitle">{PANEL_TITLE}</EuiModalHeaderTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiButtonGroup
          legend={i18n.SNOOZE_TYPE_LEGEND}
          options={TAB_OPTIONS}
          idSelected={activeTab}
          onChange={(id) => setActiveTab(id as SnoozeTab)}
          isFullWidth
          data-test-subj="snoozeTabs"
        />
        <EuiSpacer size="m" />
        <div data-test-subj="snoozeExpiryInput">
          {activeTab === 'quick' ? (
            <QuickSnoozePanel onScheduleChange={setQuickEndDate} />
          ) : (
            <ConditionalSnoozePanel
              onScheduleChange={setConditionalSchedule}
              fieldOptions={fieldOptions}
            />
          )}
        </div>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty data-test-subj="snoozeExpiryCancel" onClick={onCancel}>
          {i18n.CANCEL}
        </EuiButtonEmpty>
        <EuiButton
          data-test-subj="snoozeExpiryConfirm"
          onClick={() => pendingSchedule && onConfirm(pendingSchedule)}
          isDisabled={isConfirmDisabled}
          fill
        >
          {QUICK_SNOOZE_POPOVER_APPLY}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

export const openSnoozeExpiryModal = (
  overlays: OverlayStart,
  rendering: CoreStart['rendering'],
  fieldOptions?: string[]
): Promise<SnoozeExpiryModalResult | undefined> => {
  return new Promise<SnoozeExpiryModalResult | undefined>((resolve) => {
    const ref = overlays.openModal(
      toMountPoint(
        <SnoozeExpiryModal
          onConfirm={(schedule) => {
            ref.close();
            resolve(schedule);
          }}
          onCancel={() => {
            ref.close();
            resolve(undefined);
          }}
          fieldOptions={fieldOptions}
        />,
        rendering
      )
    );
  });
};
