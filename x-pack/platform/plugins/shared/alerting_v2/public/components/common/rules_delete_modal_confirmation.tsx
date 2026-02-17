/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export const RulesDeleteModalConfirmation = ({
  onCancel,
  onConfirm,
}: {
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}) => {
  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      title={DELETE_RULE_MODAL_TITLE}
      titleProps={{ id: modalTitleId }}
      buttonColor="danger"
      data-test-subj="rulesDeleteConfirmation"
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={CANCEL_BUTTON_TEXT}
      confirmButtonText={DELETE_RULE_MODAL_TITLE}
    >
      <p>{DELETE_RULE_MODAL_TEXT}</p>
    </EuiConfirmModal>
  );
};

const CANCEL_BUTTON_TEXT = i18n.translate('xpack.alertingV2.ruleDetails.cancelDeleteButtonLabel', {
  defaultMessage: 'Cancel',
});

const DELETE_RULE_MODAL_TITLE = i18n.translate(
  'xpack.alertingV2.ruleDetails.DELETE_RULE_MODAL_TITLE',
  {
    defaultMessage: 'Delete',
  }
);

const DELETE_RULE_MODAL_TEXT = i18n.translate(
  'xpack.alertingV2.ruleDetails.DELETE_RULE_MODAL_TEXT',
  {
    defaultMessage: 'Are you sure you want to delete this rule?',
  }
);
