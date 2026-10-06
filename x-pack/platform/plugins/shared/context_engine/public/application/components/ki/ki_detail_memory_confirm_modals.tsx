/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

interface KiDetailMemoryConfirmModalsProps {
  isForgetConfirmOpen: boolean;
  onCloseForgetConfirm: () => void;
  onConfirmForget: () => void;
  isRestoreConfirmOpen: boolean;
  onCloseRestoreConfirm: () => void;
  onConfirmRestore: () => void;
}

export const KiDetailMemoryConfirmModals = ({
  isForgetConfirmOpen,
  onCloseForgetConfirm,
  onConfirmForget,
  isRestoreConfirmOpen,
  onCloseRestoreConfirm,
  onConfirmRestore,
}: KiDetailMemoryConfirmModalsProps) => (
  <>
    {isForgetConfirmOpen ? (
      <EuiConfirmModal
        title={i18n.translate('xpack.contextEngine.kiDetail.memory.forgetConfirmTitle', {
          defaultMessage: 'Forget this memory?',
        })}
        onCancel={onCloseForgetConfirm}
        onConfirm={onConfirmForget}
        cancelButtonText={i18n.translate('xpack.contextEngine.kiDetail.memory.forgetCancel', {
          defaultMessage: 'Cancel',
        })}
        confirmButtonText={i18n.translate('xpack.contextEngine.kiDetail.memory.forgetConfirm', {
          defaultMessage: 'Forget',
        })}
        buttonColor="danger"
        defaultFocusedButton="cancel"
        data-test-subj="contextKiDetailForgetConfirmModal"
      >
        <p>
          <FormattedMessage
            id="xpack.contextEngine.kiDetail.memory.forgetConfirmBody"
            defaultMessage="This memory will no longer be returned in agent recall. You can restore it later from this page."
          />
        </p>
      </EuiConfirmModal>
    ) : null}
    {isRestoreConfirmOpen ? (
      <EuiConfirmModal
        title={i18n.translate('xpack.contextEngine.kiDetail.memory.restoreConfirmTitle', {
          defaultMessage: 'Restore this memory?',
        })}
        onCancel={onCloseRestoreConfirm}
        onConfirm={onConfirmRestore}
        cancelButtonText={i18n.translate('xpack.contextEngine.kiDetail.memory.restoreCancel', {
          defaultMessage: 'Cancel',
        })}
        confirmButtonText={i18n.translate('xpack.contextEngine.kiDetail.memory.restoreConfirm', {
          defaultMessage: 'Restore',
        })}
        buttonColor="primary"
        defaultFocusedButton="cancel"
        data-test-subj="contextKiDetailRestoreConfirmModal"
      >
        <p>
          <FormattedMessage
            id="xpack.contextEngine.kiDetail.memory.restoreConfirmBody"
            defaultMessage="Agents will be able to recall this memory again."
          />
        </p>
      </EuiConfirmModal>
    ) : null}
  </>
);
