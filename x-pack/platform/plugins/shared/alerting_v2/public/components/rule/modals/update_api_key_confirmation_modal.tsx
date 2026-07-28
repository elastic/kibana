/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

interface SingleUpdateApiKeyProps {
  ruleName: string;
  ruleCount?: undefined;
}

interface BulkUpdateApiKeyProps {
  ruleCount: number;
  ruleName?: undefined;
}

type UpdateApiKeyConfirmationModalProps = (SingleUpdateApiKeyProps | BulkUpdateApiKeyProps) & {
  onCancel: () => void;
  onConfirm: () => void;
  isLoading: boolean;
};

export const UpdateApiKeyConfirmationModal = ({
  ruleName,
  ruleCount,
  onCancel,
  onConfirm,
  isLoading,
}: UpdateApiKeyConfirmationModalProps) => {
  const modalTitleId = useGeneratedHtmlId();
  const isBulk = ruleCount !== undefined;

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      titleProps={{ id: modalTitleId }}
      title={
        isBulk
          ? i18n.translate('xpack.alertingV2.updateApiKeyConfirmationModal.bulkTitle', {
              defaultMessage:
                'Update API {count, plural, one {key} other {keys}} for {count, plural, one {# rule} other {# rules}}',
              values: { count: ruleCount },
            })
          : i18n.translate('xpack.alertingV2.updateApiKeyConfirmationModal.title', {
              defaultMessage: 'Update API key',
            })
      }
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={i18n.translate(
        'xpack.alertingV2.updateApiKeyConfirmationModal.cancelButton',
        { defaultMessage: 'Cancel' }
      )}
      confirmButtonText={i18n.translate(
        'xpack.alertingV2.updateApiKeyConfirmationModal.confirmButton',
        { defaultMessage: 'Update API key' }
      )}
      buttonColor="primary"
      isLoading={isLoading}
      data-test-subj="updateApiKeyConfirmationModal"
    >
      {isBulk ? (
        <FormattedMessage
          id="xpack.alertingV2.updateApiKeyConfirmationModal.bulkBody"
          defaultMessage="The API {count, plural, one {key} other {keys}} for the selected {count, plural, one {# rule} other {# rules}} will be regenerated using your current credentials."
          values={{ count: ruleCount }}
        />
      ) : (
        <FormattedMessage
          id="xpack.alertingV2.updateApiKeyConfirmationModal.body"
          defaultMessage='The API key for the rule "{ruleName}" will be regenerated using your current credentials.'
          values={{ ruleName }}
        />
      )}
    </EuiConfirmModal>
  );
};
