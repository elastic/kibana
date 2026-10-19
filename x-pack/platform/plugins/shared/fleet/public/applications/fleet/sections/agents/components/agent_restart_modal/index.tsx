/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  sendPostAgentRestart,
  sendPostBulkAgentRestart,
  useStartServices,
} from '../../../../hooks';
import type { Agent } from '../../../../types';

export interface AgentRestartModalProps {
  agents: Agent[] | string;
  agentCount: number;
  onClose: () => void;
}

export const AgentRestartModal: React.FunctionComponent<AgentRestartModalProps> = ({
  agents,
  agentCount,
  onClose,
}) => {
  const confirmModalTitleId = useGeneratedHtmlId();
  const { notifications } = useStartServices();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSingleAgent = Array.isArray(agents) && agents.length === 1;

  async function onSubmit() {
    try {
      setIsSubmitting(true);

      if (isSingleAgent) {
        await sendPostAgentRestart((agents[0] as Agent).id);
      } else {
        await sendPostBulkAgentRestart({
          agents: Array.isArray(agents) ? agents.map((agent) => agent.id) : agents,
          includeInactive: false,
        });
      }

      notifications.toasts.addSuccess(
        i18n.translate('xpack.fleet.restartAgents.successNotificationTitle', {
          defaultMessage: 'Restarting {agentCount, plural, one {agent} other {agents}}',
          values: { agentCount },
        })
      );
    } catch (err) {
      notifications.toasts.addError(err, {
        title: i18n.translate('xpack.fleet.restartAgents.errorNotificationTitle', {
          defaultMessage: 'Failed to restart {agentCount, plural, one {agent} other {agents}}',
          values: { agentCount },
        }),
      });
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  }

  return (
    <EuiConfirmModal
      data-test-subj="agentRestartModal"
      aria-labelledby={confirmModalTitleId}
      titleProps={{ id: confirmModalTitleId }}
      title={
        <FormattedMessage
          id="xpack.fleet.restartAgents.title"
          defaultMessage="Restart {agentCount, plural, one {agent} other {agents}}"
          values={{ agentCount }}
        />
      }
      onCancel={onClose}
      onConfirm={onSubmit}
      cancelButtonText={
        <FormattedMessage
          id="xpack.fleet.restartAgents.cancelButtonLabel"
          defaultMessage="Cancel"
        />
      }
      confirmButtonText={
        <FormattedMessage
          id="xpack.fleet.restartAgents.confirmButtonLabel"
          defaultMessage="Restart {agentCount, plural, one {agent} other {agents}}"
          values={{ agentCount }}
        />
      }
      confirmButtonDisabled={isSubmitting}
    >
      <p>
        {isSingleAgent ? (
          <FormattedMessage
            id="xpack.fleet.restartAgents.singleAgentDescription"
            defaultMessage="You are about to restart the Elastic Agent running on ''{hostName}''."
            values={{
              hostName:
                ((agents[0] as Agent).local_metadata?.host as any)?.hostname ?? agents[0].id,
            }}
          />
        ) : (
          <FormattedMessage
            id="xpack.fleet.restartAgents.multipleAgentsDescription"
            defaultMessage="You are about to restart {agentCount, plural, one {# agent} other {# agents}}."
            values={{ agentCount }}
          />
        )}
      </p>
    </EuiConfirmModal>
  );
};
