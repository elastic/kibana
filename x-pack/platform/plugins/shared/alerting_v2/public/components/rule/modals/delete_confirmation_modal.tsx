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

interface SingleDeleteProps {
  ruleName: string;
  ruleCount?: undefined;
}

interface BulkDeleteProps {
  ruleCount: number;
  ruleName?: undefined;
}

type DeleteConfirmationModalProps = (SingleDeleteProps | BulkDeleteProps) & {
  onCancel: () => void;
  onConfirm: () => void;
  isLoading: boolean;
};

export const DeleteConfirmationModal = ({
  ruleName,
  ruleCount,
  onCancel,
  onConfirm,
  isLoading,
}: DeleteConfirmationModalProps) => {
  const modalTitleId = useGeneratedHtmlId();
  const isBulk = ruleCount !== undefined;

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      titleProps={{ id: modalTitleId }}
      title={
        isBulk
          ? i18n.translate('xpack.alertingV2.deleteConfirmationModal.bulkTitle', {
              defaultMessage: 'Delete {count, plural, one {# rule} other {# rules}}',
              values: { count: ruleCount },
            })
          : i18n.translate('xpack.alertingV2.deleteConfirmationModal.title', {
              defaultMessage: 'Delete rule',
            })
      }
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={i18n.translate('xpack.alertingV2.deleteConfirmationModal.cancelButton', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('xpack.alertingV2.deleteConfirmationModal.confirmButton', {
        defaultMessage: 'Delete',
      })}
      buttonColor="danger"
      isLoading={isLoading}
      data-test-subj="deleteRuleConfirmationModal"
    >
      {isBulk ? (
        <FormattedMessage
          id="xpack.alertingV2.deleteConfirmationModal.bulkBody"
          defaultMessage="Are you sure you want to delete {count, plural, one {# rule} other {# rules}}? This action cannot be undone."
          values={{ count: ruleCount }}
        />
      ) : (
        <FormattedMessage
          id="xpack.alertingV2.deleteConfirmationModal.body"
          defaultMessage='Are you sure you want to delete the rule "{ruleName}"? This action cannot be undone.'
          values={{ ruleName }}
        />
      )}
    </EuiConfirmModal>
  );
};
