/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useRef, useState } from 'react';
import { EuiConfirmModal, EuiOverlayMask } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { useLibs } from '../hooks';

interface Props {
  children: (unenrollAgents: UnenrollAgents) => React.ReactElement;
}

export type UnenrollAgents = (
  agents: string[] | string,
  agentsCount: number,
  onSuccess?: OnSuccessCallback
) => void;

type OnSuccessCallback = (agentsUnenrolled: string[]) => void;

export const AgentUnenrollProvider: React.FunctionComponent<Props> = ({ children }) => {
  const libs = useLibs();
  const [agents, setAgents] = useState<string[] | string>([]);
  const [agentsCount, setAgentsCount] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const onSuccessCallback = useRef<OnSuccessCallback | null>(null);

  const unenrollAgentsPrompt: UnenrollAgents = (
    agentsToUnenroll,
    agentsToUnenrollCount,
    onSuccess = () => undefined
  ) => {
    if (
      agentsToUnenroll === undefined ||
      (Array.isArray(agentsToUnenroll) && agentsToUnenroll.length === 0)
    ) {
      throw new Error('No agents specified for unenrollment');
    }
    setIsModalOpen(true);
    setAgents(agentsToUnenroll);
    setAgentsCount(agentsToUnenrollCount);
    onSuccessCallback.current = onSuccess;
  };

  const closeModal = () => {
    setAgents([]);
    setAgentsCount(0);
    setIsLoading(false);
    setIsModalOpen(false);
  };

  const unenrollAgents = async () => {
    setIsLoading(true);

    try {
      const unenrollByKuery = typeof agents === 'string';
      const agentsToUnenroll =
        unenrollByKuery && !(agents as string).trim() ? 'agents.active:true' : agents;
      const unenrollMethod = unenrollByKuery ? libs.agents.unenrollByKuery : libs.agents.unenroll;
      const { results } = await unenrollMethod(agentsToUnenroll as string & string[]);

      const successfulResults = results.filter(result => result.success);
      const failedResults = results.filter(result => !result.success);

      if (successfulResults.length) {
        const hasMultipleSuccesses = successfulResults.length > 1;
        const successMessage = hasMultipleSuccesses
          ? i18n.translate('xpack.fleet.unenrollAgents.successMultipleNotificationTitle', {
              defaultMessage: 'Unenrolled {count} agents',
              values: { count: successfulResults.length },
            })
          : i18n.translate('xpack.fleet.unenrollAgents.successSingleNotificationTitle', {
              defaultMessage: "Unenrolled agent '{id}'",
              values: { id: successfulResults[0].id },
            });
        libs.framework.notifications.addSuccess(successMessage);
      }

      if (failedResults.length) {
        const hasMultipleFailures = failedResults.length > 1;
        const failureMessage = hasMultipleFailures
          ? i18n.translate('xpack.fleet.unenrollAgents.failureMultipleNotificationTitle', {
              defaultMessage: 'Error unenrolling {count} agents',
              values: { count: failedResults.length },
            })
          : i18n.translate('xpack.fleet.unenrollAgents.failureSingleNotificationTitle', {
              defaultMessage: "Error unenrolling agent '{id}'",
              values: { id: failedResults[0].id },
            });
        libs.framework.notifications.addDanger(failureMessage);
      }

      if (onSuccessCallback.current) {
        onSuccessCallback.current(successfulResults.map(result => result.id));
      }
    } catch (e) {
      libs.framework.notifications.addDanger(
        i18n.translate('xpack.fleet.unenrollAgents.fatalErrorNotificationTitle', {
          defaultMessage: 'Error unenrolling agents',
        })
      );
    }

    closeModal();
  };

  const renderModal = () => {
    if (!isModalOpen) {
      return null;
    }

    const unenrollByKuery = typeof agents === 'string';
    const isSingle = agentsCount === 1;

    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={
            isSingle && !unenrollByKuery ? (
              <FormattedMessage
                id="xpack.fleet.unenrollAgents.confirmModal.deleteSingleTitle"
                defaultMessage="Unenroll agent '{id}'?"
                values={{ id: agents[0] }}
              />
            ) : (
              <FormattedMessage
                id="xpack.fleet.unenrollAgents.confirmModal.deleteMultipleTitle"
                defaultMessage="Unenroll {count, plural, one {# agent} other {# agents}}?"
                values={{ count: agentsCount }}
              />
            )
          }
          onCancel={closeModal}
          onConfirm={unenrollAgents}
          cancelButtonText={
            <FormattedMessage
              id="xpack.fleet.unenrollAgents.confirmModal.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          }
          confirmButtonText={
            isLoading ? (
              <FormattedMessage
                id="xpack.fleet.unenrollAgents.confirmModal.loadingButtonLabel"
                defaultMessage="Loading…"
              />
            ) : (
              <FormattedMessage
                id="xpack.fleet.unenrollAgents.confirmModal.confirmButtonLabel"
                defaultMessage="Unenroll"
              />
            )
          }
          buttonColor="danger"
          confirmButtonDisabled={isLoading}
        />
      </EuiOverlayMask>
    );
  };

  return (
    <Fragment>
      {children(unenrollAgentsPrompt)}
      {renderModal()}
    </Fragment>
  );
};
