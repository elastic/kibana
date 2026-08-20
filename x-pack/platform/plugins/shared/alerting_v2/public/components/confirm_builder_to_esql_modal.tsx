/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const SWITCH_TITLE = i18n.translate('xpack.alertingV2.confirmBuilderToEsqlModal.switchTitle', {
  defaultMessage: 'Switch to ES|QL mode?',
});

const SWITCH_DESCRIPTION = i18n.translate(
  'xpack.alertingV2.confirmBuilderToEsqlModal.switchDescription',
  {
    defaultMessage:
      'Switching to ES|QL mode is permanent. The rule will no longer be editable through the builder.',
  }
);

const UNPARSEABLE_TITLE = i18n.translate(
  'xpack.alertingV2.confirmBuilderToEsqlModal.unparseableTitle',
  { defaultMessage: 'Rule cannot be opened in builder mode' }
);

const UNPARSEABLE_DESCRIPTION = i18n.translate(
  'xpack.alertingV2.confirmBuilderToEsqlModal.unparseableDescription',
  {
    defaultMessage:
      'The query has been modified outside the builder and can no longer be parsed. Opening in ES|QL mode is permanent.',
  }
);

const CONFIRM_BUTTON = i18n.translate('xpack.alertingV2.confirmBuilderToEsqlModal.confirm', {
  defaultMessage: 'Open in ES|QL mode',
});

const CANCEL_BUTTON = i18n.translate('xpack.alertingV2.confirmBuilderToEsqlModal.cancel', {
  defaultMessage: 'Cancel',
});

export type ConfirmBuilderToEsqlVariant = 'switch' | 'unparseable';

export interface ConfirmBuilderToEsqlModalProps {
  onCancel: () => void;
  onConfirm: () => void;
  variant?: ConfirmBuilderToEsqlVariant;
}

export const ConfirmBuilderToEsqlModal: React.FC<ConfirmBuilderToEsqlModalProps> = ({
  onCancel,
  onConfirm,
  variant = 'switch',
}) => {
  const confirmModalTitleId = useGeneratedHtmlId();
  const title = variant === 'unparseable' ? UNPARSEABLE_TITLE : SWITCH_TITLE;
  const description = variant === 'unparseable' ? UNPARSEABLE_DESCRIPTION : SWITCH_DESCRIPTION;

  return (
    <EuiConfirmModal
      aria-labelledby={confirmModalTitleId}
      onCancel={onCancel}
      onConfirm={onConfirm}
      data-test-subj="alertingV2ConfirmBuilderToEsqlModal"
      buttonColor="danger"
      defaultFocusedButton="cancel"
      title={title}
      titleProps={{ id: confirmModalTitleId }}
      confirmButtonText={CONFIRM_BUTTON}
      cancelButtonText={CANCEL_BUTTON}
    >
      <EuiText>
        <p>{description}</p>
      </EuiText>
    </EuiConfirmModal>
  );
};
