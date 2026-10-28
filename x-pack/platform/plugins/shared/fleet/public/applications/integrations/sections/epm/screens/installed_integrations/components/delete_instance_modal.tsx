/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiConfirmModal, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

export const DeleteInstanceModal: React.FunctionComponent<{
  instanceName: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}> = ({ instanceName, onClose, onConfirm }) => {
  const [isLoading, setIsLoading] = useState(false);
  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      titleProps={{ id: modalTitleId }}
      title={i18n.translate('xpack.fleet.epmInstalledIntegrations.instances.deleteModal.title', {
        defaultMessage: 'Delete instance {instanceName}?',
        values: { instanceName },
      })}
      cancelButtonText={i18n.translate(
        'xpack.fleet.epmInstalledIntegrations.instances.deleteModal.cancel',
        { defaultMessage: 'Cancel' }
      )}
      confirmButtonText={i18n.translate(
        'xpack.fleet.epmInstalledIntegrations.instances.deleteModal.confirm',
        { defaultMessage: 'Delete instance' }
      )}
      buttonColor="danger"
      isLoading={isLoading}
      onCancel={onClose}
      onConfirm={async () => {
        setIsLoading(true);
        try {
          await onConfirm();
        } finally {
          setIsLoading(false);
        }
      }}
      data-test-subj="deleteInstanceModal"
    >
      <EuiText size="s">
        <p>
          <FormattedMessage
            id="xpack.fleet.epmInstalledIntegrations.instances.deleteModal.body"
            defaultMessage="This removes the saved onboarding session, so it can no longer be reopened from here. Its integration policies, agent policies, agents and Elastic Cloud Forwarder stacks are not removed and keep collecting data."
          />
        </p>
      </EuiText>
    </EuiConfirmModal>
  );
};
