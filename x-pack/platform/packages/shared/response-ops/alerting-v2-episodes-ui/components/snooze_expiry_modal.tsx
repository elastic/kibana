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
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { AlertEpisodeSnoozeForm, computeEpisodeSnoozedUntil } from './actions/snooze_form';
import * as i18n from '../actions/translations';

interface SnoozeExpiryModalProps {
  onConfirm: (expiry: string) => void;
  onCancel: () => void;
}

const SnoozeExpiryModal = ({ onConfirm, onCancel }: SnoozeExpiryModalProps) => {
  const [pendingExpiry, setPendingExpiry] = useState<string>(computeEpisodeSnoozedUntil(1, 'h'));

  return (
    <EuiModal
      onClose={onCancel}
      aria-labelledby="snoozeExpiryModalTitle"
      data-test-subj="snoozeExpiryModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id="snoozeExpiryModalTitle">
          {i18n.SNOOZE_MODAL_TITLE}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <div data-test-subj="snoozeExpiryInput">
          <AlertEpisodeSnoozeForm onApplySnooze={setPendingExpiry} />
        </div>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty data-test-subj="snoozeExpiryCancel" onClick={onCancel}>
          {i18n.CANCEL}
        </EuiButtonEmpty>
        <EuiButton
          data-test-subj="snoozeExpiryConfirm"
          onClick={() => onConfirm(pendingExpiry)}
          fill
        >
          {i18n.SNOOZE}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

export const openSnoozeExpiryModal = (
  overlays: OverlayStart,
  rendering: CoreStart['rendering']
): Promise<string | undefined> => {
  return new Promise<string | undefined>((resolve) => {
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
