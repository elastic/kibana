/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { Agent } from '../../../../types';
import {
  sendPostBulkRemoveCollectors,
  sendPostRemoveCollector,
  useStartServices,
} from '../../../../hooks';

interface Props {
  onClose: () => void;
  agents: Agent[] | string;
  agentCount: number;
}

export const AgentRemoveCollectorModal: React.FunctionComponent<Props> = ({
  onClose,
  agents,
  agentCount,
}) => {
  const confirmModalTitleId = useGeneratedHtmlId();
  const { notifications } = useStartServices();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSingleAgent = Array.isArray(agents) && agents.length === 1;

  async function onSubmit() {
    try {
      setIsSubmitting(true);
      const { error } = isSingleAgent
        ? await sendPostRemoveCollector((agents[0] as Agent).id)
        : await sendPostBulkRemoveCollectors({
            agents: Array.isArray(agents) ? agents.map((agent) => agent.id) : agents,
            includeInactive: true,
          });
      if (error) {
        throw error;
      }
      setIsSubmitting(false);
      const successMessage = isSingleAgent
        ? i18n.translate('xpack.fleet.removeCollectors.successSingleNotificationTitle', {
            defaultMessage: 'Collector removed',
          })
        : i18n.translate('xpack.fleet.removeCollectors.successMultiNotificationTitle', {
            defaultMessage: 'Collectors removed',
          });
      notifications.toasts.addSuccess(successMessage);
      onClose();
    } catch (error) {
      setIsSubmitting(false);
      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.fleet.removeCollectors.fatalErrorNotificationTitle', {
          defaultMessage: 'Error removing {count, plural, one {collector} other {collectors}}',
          values: { count: agentCount },
        }),
      });
    }
  }

  return (
    <EuiConfirmModal
      data-test-subj="agentRemoveCollectorModal"
      aria-labelledby={confirmModalTitleId}
      title={
        isSingleAgent ? (
          <FormattedMessage
            id="xpack.fleet.removeCollectors.singleTitle"
            defaultMessage="Remove collector"
          />
        ) : (
          <FormattedMessage
            id="xpack.fleet.removeCollectors.multipleTitle"
            defaultMessage="Remove {count} collectors"
            values={{ count: agentCount }}
          />
        )
      }
      titleProps={{ id: confirmModalTitleId }}
      onCancel={onClose}
      onConfirm={onSubmit}
      cancelButtonText={
        <FormattedMessage
          id="xpack.fleet.removeCollectors.cancelButtonLabel"
          defaultMessage="Cancel"
        />
      }
      confirmButtonDisabled={isSubmitting}
      confirmButtonText={
        isSingleAgent ? (
          <FormattedMessage
            id="xpack.fleet.removeCollectors.confirmSingleButtonLabel"
            defaultMessage="Remove collector"
          />
        ) : (
          <FormattedMessage
            id="xpack.fleet.removeCollectors.confirmMultipleButtonLabel"
            defaultMessage="Remove {count} collectors"
            values={{ count: agentCount }}
          />
        )
      }
      buttonColor="danger"
    >
      <p>
        {isSingleAgent ? (
          <FormattedMessage
            id="xpack.fleet.removeCollectors.singleDescription"
            defaultMessage="This will remove the selected collector from the Fleet list. The collector's enrollment credentials remain valid, so if it is still running it may reconnect on its own."
          />
        ) : (
          <FormattedMessage
            id="xpack.fleet.removeCollectors.multipleDescription"
            defaultMessage="This will remove the selected collectors from the Fleet list. Enrollment credentials remain valid, so any collectors still running may reconnect on their own."
          />
        )}
      </p>
    </EuiConfirmModal>
  );
};
