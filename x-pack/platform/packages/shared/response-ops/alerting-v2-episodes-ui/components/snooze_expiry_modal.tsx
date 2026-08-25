/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
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
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import { toMountPoint } from '@kbn/react-kibana-mount';
import {
  PANEL_TITLE,
  QUICK_SNOOZE_POPOVER_APPLY,
  QUICK_SNOOZE_POPOVER_SUBTITLE,
  QuickSnoozePanel,
} from '@kbn/response-ops-alert-snooze';
import * as i18n from '../actions/translations';

export type SnoozeExpiryModalResult = string | null;

interface SnoozeExpiryModalProps {
  onConfirm: (expiry: SnoozeExpiryModalResult) => void;
  onCancel: () => void;
}

const SnoozeExpiryModal = ({ onConfirm, onCancel }: SnoozeExpiryModalProps) => {
  const [pendingExpiry, setPendingExpiry] = useState<string | null | undefined>(null);
  const isConfirmDisabled = pendingExpiry === undefined;

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
        <EuiText size="xs" color="subdued">
          <p>{QUICK_SNOOZE_POPOVER_SUBTITLE}</p>
        </EuiText>
        <EuiHorizontalRule margin="m" />
        <EuiSpacer size="xs" />
        <div data-test-subj="snoozeExpiryInput">
          <QuickSnoozePanel onScheduleChange={setPendingExpiry} />
        </div>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty data-test-subj="snoozeExpiryCancel" onClick={onCancel}>
          {i18n.CANCEL}
        </EuiButtonEmpty>
        <EuiButton
          data-test-subj="snoozeExpiryConfirm"
          onClick={() => onConfirm(pendingExpiry ?? null)}
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
  rendering: CoreStart['rendering']
): Promise<SnoozeExpiryModalResult | undefined> => {
  return new Promise<SnoozeExpiryModalResult | undefined>((resolve) => {
    const ref = overlays.openModal(
      toMountPoint(
        <SnoozeExpiryModal
          onConfirm={(expiry) => {
            ref.close();
            resolve(expiry);
          }}
          onCancel={() => {
            ref.close();
            resolve(undefined);
          }}
        />,
        rendering
      )
    );
  });
};
