/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiCallOut,
  EuiConfirmModal,
  EuiFieldNumber,
  EuiFormRow,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  isUninstallDelayValid,
  UNINSTALL_DELAY_DEFAULT_SECONDS,
  UNINSTALL_DELAY_MAX_SECONDS,
  UNINSTALL_DELAY_MIN_SECONDS,
} from '../../../../../../../common/services';
import {
  sendPostAgentUninstall,
  sendPostBulkAgentUninstall,
  useStartServices,
} from '../../../../hooks';
import type { Agent } from '../../../../types';

const SECONDS_PER_HOUR = 60 * 60;
const MIN_DELAY_HOURS = UNINSTALL_DELAY_MIN_SECONDS / SECONDS_PER_HOUR;
const MAX_DELAY_HOURS = UNINSTALL_DELAY_MAX_SECONDS / SECONDS_PER_HOUR;
const DEFAULT_DELAY_HOURS = UNINSTALL_DELAY_DEFAULT_SECONDS / SECONDS_PER_HOUR;

export interface AgentUninstallModalProps {
  agents: Agent[] | string;
  agentCount: number;
  onClose: () => void;
}

export const AgentUninstallModal: React.FunctionComponent<AgentUninstallModalProps> = ({
  agents,
  agentCount,
  onClose,
}) => {
  const confirmModalTitleId = useGeneratedHtmlId();
  const { notifications } = useStartServices();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [delayHours, setDelayHours] = useState<string>(String(DEFAULT_DELAY_HOURS));
  const isSingleAgent = Array.isArray(agents) && agents.length === 1;

  const delayHoursNumber = delayHours === '' ? Number.NaN : Number(delayHours);
  const isDelayValid =
    Number.isInteger(delayHoursNumber) &&
    isUninstallDelayValid(delayHoursNumber * SECONDS_PER_HOUR);

  async function onSubmit() {
    if (!isDelayValid) {
      return;
    }
    const delaySeconds = delayHoursNumber * SECONDS_PER_HOUR;
    try {
      setIsSubmitting(true);

      if (isSingleAgent) {
        await sendPostAgentUninstall((agents[0] as Agent).id, { delay_seconds: delaySeconds });
      } else {
        await sendPostBulkAgentUninstall({
          agents: Array.isArray(agents) ? agents.map((agent) => agent.id) : agents,
          delay_seconds: delaySeconds,
          includeInactive: false,
        });
      }

      notifications.toasts.addSuccess(
        i18n.translate('xpack.fleet.uninstallAgents.successNotificationTitle', {
          defaultMessage:
            'Scheduled the uninstall of {agentCount, plural, one {agent} other {agents}}',
          values: { agentCount },
        })
      );
    } catch (err) {
      notifications.toasts.addError(err, {
        title: i18n.translate('xpack.fleet.uninstallAgents.errorNotificationTitle', {
          defaultMessage: 'Failed to uninstall {agentCount, plural, one {agent} other {agents}}',
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
      data-test-subj="agentUninstallModal"
      aria-labelledby={confirmModalTitleId}
      titleProps={{ id: confirmModalTitleId }}
      title={
        <FormattedMessage
          id="xpack.fleet.uninstallAgents.title"
          defaultMessage="Uninstall {agentCount, plural, one {agent} other {agents}}"
          values={{ agentCount }}
        />
      }
      onCancel={onClose}
      onConfirm={onSubmit}
      buttonColor="danger"
      cancelButtonText={
        <FormattedMessage
          id="xpack.fleet.uninstallAgents.cancelButtonLabel"
          defaultMessage="Cancel"
        />
      }
      confirmButtonText={
        <FormattedMessage
          id="xpack.fleet.uninstallAgents.confirmButtonLabel"
          defaultMessage="Uninstall {agentCount, plural, one {agent} other {agents}}"
          values={{ agentCount }}
        />
      }
      confirmButtonDisabled={isSubmitting || !isDelayValid}
    >
      <p data-test-subj="agentUninstallModalDescription">
        {isSingleAgent ? (
          <FormattedMessage
            id="xpack.fleet.uninstallAgents.singleAgentDescription"
            defaultMessage="This will remove the Elastic Agent running on ''{hostName}'' from the host."
            values={{
              hostName:
                ((agents[0] as Agent).local_metadata?.host as any)?.hostname ?? agents[0].id,
            }}
          />
        ) : (
          <FormattedMessage
            id="xpack.fleet.uninstallAgents.multipleAgentsDescription"
            defaultMessage="This will affect {agentCount, plural, one {# agent} other {# agents}}. Agents that do not support remote uninstall, have not been unenrolled first, or are unprivileged are skipped."
            values={{ agentCount }}
          />
        )}
      </p>
      <EuiSpacer size="m" />
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.fleet.uninstallAgents.delayLabel"
            defaultMessage="Grace period (hours)"
          />
        }
        helpText={
          <FormattedMessage
            id="xpack.fleet.uninstallAgents.delayHelpText"
            defaultMessage="The uninstall runs after this period and can be cancelled from the agent activity until then. Between {min} and {max} hours."
            values={{ min: MIN_DELAY_HOURS, max: MAX_DELAY_HOURS }}
          />
        }
        isInvalid={!isDelayValid}
        error={i18n.translate('xpack.fleet.uninstallAgents.delayError', {
          defaultMessage: 'Enter a whole number of hours between {min} and {max}.',
          values: { min: MIN_DELAY_HOURS, max: MAX_DELAY_HOURS },
        })}
      >
        <EuiFieldNumber
          fullWidth
          data-test-subj="agentUninstallDelayInput"
          value={delayHours}
          min={MIN_DELAY_HOURS}
          max={MAX_DELAY_HOURS}
          step={1}
          isInvalid={!isDelayValid}
          onChange={(e) => setDelayHours(e.target.value)}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiCallOut
        size="s"
        color="warning"
        iconType="warning"
        data-test-subj="agentUninstallModalWarning"
        title={i18n.translate('xpack.fleet.uninstallAgents.warningTitle', {
          defaultMessage:
            'Once the grace period has passed, the uninstall cannot be cancelled or undone.',
        })}
      />
    </EuiConfirmModal>
  );
};
