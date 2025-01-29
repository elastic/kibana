/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { EuiCheckbox, EuiConfirmModal } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { RequestDiagnosticsAdditionalMetrics } from '../../../../../../../common/types';
import type { Agent } from '../../../../types';
import {
  sendPostRequestDiagnostics,
  sendPostBulkRequestDiagnostics,
  useStartServices,
  useLink,
} from '../../../../hooks';

interface Props {
  onClose: () => void;
  agents: Agent[] | string;
  agentCount: number;
}

export const AgentRequestDiagnosticsModal: React.FunctionComponent<Props> = ({
  onClose,
  agents,
  agentCount,
}) => {
  const { notifications } = useStartServices();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSingleAgent = Array.isArray(agents) && agents.length === 1;
  const { getPath } = useLink();
  const history = useHistory();
  const [cpuMetricsEnabled, setCPUMetricsEnabled] = useState(false);

  async function onSubmit() {
    try {
      setIsSubmitting(true);
      const additionalMetrics = cpuMetricsEnabled ? [RequestDiagnosticsAdditionalMetrics.CPU] : [];

      const { error } = isSingleAgent
        ? await sendPostRequestDiagnostics((agents[0] as Agent).id, {
            additional_metrics: additionalMetrics,
          })
        : await sendPostBulkRequestDiagnostics({
            agents: typeof agents === 'string' ? agents : agents.map((agent) => agent.id),
            additional_metrics: additionalMetrics,
          });
      if (error) {
        throw error;
      }
      setIsSubmitting(false);
      const successMessage = i18n.translate(
        'xpack.fleet.requestDiagnostics.successSingleNotificationTitle',
        {
          defaultMessage: 'Request diagnostics submitted',
        }
      );
      notifications.toasts.addSuccess(successMessage);

      if (isSingleAgent) {
        const path = getPath('agent_details_diagnostics', { agentId: (agents[0] as Agent).id });
        history.push(path);
      }
      onClose();
    } catch (error) {
      setIsSubmitting(false);
      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.fleet.requestDiagnostics.fatalErrorNotificationTitle', {
          defaultMessage:
            'Error requesting diagnostics {count, plural, one {agent} other {agents}}',
          values: { count: agentCount },
        }),
      });
    }
  }

  return (
    <EuiConfirmModal
      data-test-subj="requestDiagnosticsModal"
      title={
        isSingleAgent ? (
          <FormattedMessage
            id="xpack.fleet.requestDiagnostics.singleTitle"
            defaultMessage="Request diagnostics"
          />
        ) : (
          <FormattedMessage
            id="xpack.fleet.requestDiagnostics.multipleTitle"
            defaultMessage="Request diagnostics for {count} agents"
            values={{ count: agentCount }}
          />
        )
      }
      onCancel={onClose}
      onConfirm={onSubmit}
      cancelButtonText={
        <FormattedMessage
          id="xpack.fleet.requestDiagnostics.cancelButtonLabel"
          defaultMessage="Cancel"
        />
      }
      confirmButtonDisabled={isSubmitting}
      confirmButtonText={
        isSingleAgent ? (
          <FormattedMessage
            id="xpack.fleet.requestDiagnostics.confirmSingleButtonLabel"
            defaultMessage="Request diagnostics"
          />
        ) : (
          <FormattedMessage
            id="xpack.fleet.requestDiagnostics.confirmMultipleButtonLabel"
            defaultMessage="Request diagnostics for {count} agents"
            values={{ count: agentCount }}
          />
        )
      }
      buttonColor="primary"
    >
      <p>
        <FormattedMessage
          id="xpack.fleet.requestDiagnostics.description"
          defaultMessage="Consider changing the log level to debug before requesting a diagnostic. Diagnostics files are stored in Elasticsearch, and as such can incur storage costs. By default, files are deleted periodically through an ILM policy."
        />
      </p>
      <p>
        <EuiCheckbox
          id="cpuMetricsCheckbox"
          data-test-subj="cpuMetricsCheckbox"
          label="Collect additional CPU metrics"
          checked={cpuMetricsEnabled}
          onChange={() => setCPUMetricsEnabled(!cpuMetricsEnabled)}
        />
      </p>
    </EuiConfirmModal>
  );
};
