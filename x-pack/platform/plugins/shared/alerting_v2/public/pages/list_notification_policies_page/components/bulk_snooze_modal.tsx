/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { NotificationPolicySnoozeForm } from '../../../components/notification_policy/notification_policy_snooze_form';

interface BulkSnoozeModalProps {
  count: number;
  onApplySnooze: (snoozedUntil: string) => void;
  onCancel: () => void;
}

export const BulkSnoozeModal = ({ count, onApplySnooze, onCancel }: BulkSnoozeModalProps) => {
  const modalTitleId = useGeneratedHtmlId();
  return (
    <EuiModal aria-labelledby={modalTitleId} onClose={onCancel}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          <FormattedMessage
            id="xpack.alertingV2.notificationPolicy.bulkSnoozeModal.title"
            defaultMessage="Snooze {count} {count, plural, one {notification policy} other {notification policies}}"
            values={{ count }}
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <NotificationPolicySnoozeForm
          isSnoozed={false}
          onApplySnooze={onApplySnooze}
          onCancelSnooze={onCancel}
        />
      </EuiModalBody>
    </EuiModal>
  );
};
