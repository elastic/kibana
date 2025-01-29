/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

interface Props {
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmRuleSave: React.FC<Props> = ({ onConfirm, onCancel }) => {
  return (
    <EuiConfirmModal
      title={i18n.translate(
        'xpack.triggersActionsUI.sections.confirmRuleSave.confirmRuleSaveTitle',
        {
          defaultMessage: 'Save rule with no actions?',
        }
      )}
      onCancel={onCancel}
      onConfirm={onConfirm}
      confirmButtonText={i18n.translate(
        'xpack.triggersActionsUI.sections.confirmRuleSave.confirmRuleSaveConfirmButtonText',
        {
          defaultMessage: 'Save rule',
        }
      )}
      cancelButtonText={i18n.translate(
        'xpack.triggersActionsUI.sections.confirmRuleSave.confirmRuleSaveCancelButtonText',
        {
          defaultMessage: 'Cancel',
        }
      )}
      defaultFocusedButton="confirm"
      data-test-subj="confirmRuleSaveModal"
    >
      <p>
        <FormattedMessage
          id="xpack.triggersActionsUI.sections.confirmRuleSave.confirmRuleSaveWithoutActionsMessage"
          defaultMessage="You can add an action at anytime."
        />
      </p>
    </EuiConfirmModal>
  );
};
