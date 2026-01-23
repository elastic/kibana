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
  sendPostAgentRollback,
  sendPostBulkAgentRollback,
  useStartServices,
} from '../../../../hooks';
import type { Agent } from '../../../../types';

export interface AgentRollbackModalProps {
  agents: Agent[] | string;
  agentCount: number;
  onClose: () => void;
}

export const AgentRollbackModal: React.FunctionComponent<AgentRollbackModalProps> = ({
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
        await sendPostAgentRollback((agents[0] as Agent).id);
      } else {
        await sendPostBulkAgentRollback({
          agents: Array.isArray(agents) ? agents.map((agent) => agent.id) : agents,
          includeInactive: true,
        });
      }

      notifications.toasts.addSuccess(
        i18n.translate('xpack.fleet.rollbackAgents.successNotificationTitle', {
          defaultMessage: 'Rolling back {agentCount, plural, one {agent} other {agents}}',
          values: {
            agentCount,
          },
        })
      );
    } catch (err) {
      notifications.toasts.addError(err, {
        title: i18n.translate('xpack.fleet.agentList.rollbackAgents.errorNotificationTitle', {
          defaultMessage: 'Failed to roll back {agentCount, plural, one {agent} other {agents}}',
          values: {
            agentCount,
          },
        }),
      });
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  }

  return (
    <EuiConfirmModal
      data-test-subj="agentRollbackModal"
      aria-labelledby={confirmModalTitleId}
      titleProps={{ id: confirmModalTitleId }}
      title={
        <FormattedMessage
          id="xpack.fleet.rollbackAgents.title"
          defaultMessage="Roll back {agentCount, plural, one {agent} other {agents}} to previous version"
          values={{ agentCount }}
        />
      }
      onCancel={onClose}
      onConfirm={onSubmit}
      cancelButtonText={
        <FormattedMessage
          id="xpack.fleet.rollbackAgents.cancelButtonLabel"
          defaultMessage="Cancel"
        />
      }
      confirmButtonText={
        <FormattedMessage
          id="xpack.fleet.rollbackAgents.confirmButtonLabel"
          defaultMessage="Roll back {agentCount, plural, one {agent} other {agents}}"
          values={{ agentCount }}
        />
      }
      confirmButtonDisabled={isSubmitting}
    >
      <p>
        {isSingleAgent ? (
          <FormattedMessage
            id="xpack.fleet.rollbackAgents.singleAgentDescription"
            defaultMessage="You are about to roll back the agent running on ''{hostName}'' to version {version}. This action cannot be undone."
            values={{
              hostName: ((agents[0] as Agent).local_metadata.host as any).hostname,
              version: agents[0].upgrade?.rollbacks?.[0]?.version,
            }}
          />
        ) : (
          <FormattedMessage
            id="xpack.fleet.rollbackAgents.multipleAgentsDescription"
            defaultMessage="You are about to roll back agents to their previous version. This action can not be undone."
          />
        )}
      </p>
    </EuiConfirmModal>
  );
};
