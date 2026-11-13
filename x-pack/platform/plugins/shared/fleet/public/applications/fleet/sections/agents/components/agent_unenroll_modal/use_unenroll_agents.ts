/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';

import type { Agent } from '../../../../types';
import {
  sendPostAgentUnenroll,
  sendPostBulkAgentUnenroll,
  useStartServices,
} from '../../../../hooks';

interface UseUnenrollAgentsOptions {
  agents: Agent[] | string;
  agentCount: number;
  /**
   * Revokes the agents' local API keys and deactivates them immediately, instead of sending an
   * UNENROLL action and waiting for the agents to acknowledge it.
   */
  revoke: boolean;
  onClose: () => void;
}

const getSuccessMessage = ({
  revoke,
  isSingleAgent,
}: {
  revoke: boolean;
  isSingleAgent: boolean;
}) => {
  if (revoke) {
    return isSingleAgent
      ? i18n.translate('xpack.fleet.unenrollAgents.successForceSingleNotificationTitle', {
          defaultMessage: 'Agent unenrolled',
        })
      : i18n.translate('xpack.fleet.unenrollAgents.successForceMultiNotificationTitle', {
          defaultMessage: 'Agents unenrolled',
        });
  }

  return isSingleAgent
    ? i18n.translate('xpack.fleet.unenrollAgents.successSingleNotificationTitle', {
        defaultMessage: 'Unenrolling agent',
      })
    : i18n.translate('xpack.fleet.unenrollAgents.successMultiNotificationTitle', {
        defaultMessage: 'Unenrolling agents',
      });
};

/**
 * Submit logic shared by the unenroll and force unenroll modals, which differ only by `revoke`.
 */
export function useUnenrollAgents({
  agents,
  agentCount,
  revoke,
  onClose,
}: UseUnenrollAgentsOptions) {
  const { notifications } = useStartServices();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSingleAgent = Array.isArray(agents) && agents.length === 1;

  const onSubmit = useCallback(async () => {
    try {
      setIsSubmitting(true);
      const { error } = isSingleAgent
        ? await sendPostAgentUnenroll((agents[0] as Agent).id, {
            revoke,
          })
        : await sendPostBulkAgentUnenroll({
            agents: Array.isArray(agents) ? agents.map((agent) => agent.id) : agents,
            revoke,
            // includeInactive is only used when the agents are selected by query, it's ignored in the case of agent ids
            includeInactive: true,
          });
      if (error) {
        throw error;
      }
      setIsSubmitting(false);
      notifications.toasts.addSuccess(getSuccessMessage({ revoke, isSingleAgent }));
      onClose();
    } catch (error) {
      setIsSubmitting(false);
      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.fleet.unenrollAgents.fatalErrorNotificationTitle', {
          defaultMessage: 'Error unenrolling {count, plural, one {agent} other {agents}}',
          values: { count: agentCount },
        }),
      });
    }
  }, [agentCount, agents, isSingleAgent, notifications.toasts, onClose, revoke]);

  return { isSubmitting, isSingleAgent, onSubmit };
}
