/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

interface BulkDeleteConfirmationModalProps {
  count: number;
  onCancel: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export const BulkDeleteConfirmationModal = ({
  count,
  onCancel,
  onConfirm,
  isLoading = false,
}: BulkDeleteConfirmationModalProps) => {
  const titleId = useGeneratedHtmlId();
  return (
    <EuiConfirmModal
      id="bulkDeleteActionPoliciesConfirmModal"
      aria-labelledby={titleId}
      titleProps={{ id: titleId }}
      title={i18n.translate('xpack.alertingV2.actionPolicy.bulkDeleteModal.title', {
        defaultMessage:
          'Delete {count} {count, plural, one {action policy} other {action policies}}?',
        values: { count },
      })}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={i18n.translate(
        'xpack.alertingV2.actionPolicy.bulkDeleteModal.cancelButton',
        { defaultMessage: 'Cancel' }
      )}
      confirmButtonText={i18n.translate(
        'xpack.alertingV2.actionPolicy.bulkDeleteModal.confirmButton',
        { defaultMessage: 'Confirm' }
      )}
      buttonColor="danger"
      isLoading={isLoading}
    >
      <FormattedMessage
        id="xpack.alertingV2.actionPolicy.bulkDeleteModal.body"
        defaultMessage="Are you sure you want to delete <strong>{count}</strong> {count, plural, one {action policy} other {action policies}}? This action cannot be undone."
        values={{ count, strong: (chunks) => <strong>{chunks}</strong> }}
      />
    </EuiConfirmModal>
  );
};
