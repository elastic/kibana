/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useRef, useState } from 'react';
import { EuiConfirmModal, EuiOverlayMask } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { ReturnTypeBulkDelete } from '../../common/return_types';
import { useLibs, sendRequest } from '../hooks';

interface Props {
  children: (deletePolicies: deletePolicies) => React.ReactElement;
}

export type deletePolicies = (policies: string[], onSuccess?: OnSuccessCallback) => void;

type OnSuccessCallback = (policiesUnenrolled: string[]) => void;

export const PolicyDeleteProvider: React.FunctionComponent<Props> = ({ children }) => {
  const libs = useLibs();
  const [policies, setPolicies] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isLoadingAgentsCount, setIsLoadingAgentsCount] = useState<boolean>(false);
  const [agentsCount, setAgentsCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const onSuccessCallback = useRef<OnSuccessCallback | null>(null);

  const deletePoliciesPrompt: deletePolicies = (policiesToDelete, onSuccess = () => undefined) => {
    if (
      policiesToDelete === undefined ||
      (Array.isArray(policiesToDelete) && policiesToDelete.length === 0)
    ) {
      throw new Error('No policies specified for deletion');
    }
    setIsModalOpen(true);
    setPolicies(policiesToDelete);
    fetchAgentsCount(policiesToDelete);
    onSuccessCallback.current = onSuccess;
  };

  const closeModal = () => {
    setPolicies([]);
    setIsLoading(false);
    setIsLoadingAgentsCount(false);
    setIsModalOpen(false);
  };

  const deletePolicies = async () => {
    setIsLoading(true);

    try {
      const { data } = await sendRequest(libs.httpClient, {
        path: `/api/ingest_manager/agent_configs/delete`,
        method: 'post',
        body: {
          policies,
        },
      });
      const results = (data as ReturnTypeBulkDelete).results;

      const successfulResults = results.filter(result => result.success);
      const failedResults = results.filter(result => !result.success);

      if (successfulResults.length) {
        const hasMultipleSuccesses = successfulResults.length > 1;
        const successMessage = hasMultipleSuccesses
          ? i18n.translate('xpack.fleet.deletePolicies.successMultipleNotificationTitle', {
              defaultMessage: 'Deleted {count} policies',
              values: { count: successfulResults.length },
            })
          : i18n.translate('xpack.fleet.deletePolicies.successSingleNotificationTitle', {
              defaultMessage: "Deleted policy '{id}'",
              values: { id: successfulResults[0].id },
            });
        libs.framework.notifications.addSuccess(successMessage);
      }

      if (failedResults.length) {
        const hasMultipleFailures = failedResults.length > 1;
        const failureMessage = hasMultipleFailures
          ? i18n.translate('xpack.fleet.deletePolicies.failureMultipleNotificationTitle', {
              defaultMessage: 'Error deleting {count} policies',
              values: { count: failedResults.length },
            })
          : i18n.translate('xpack.fleet.deletePolicies.failureSingleNotificationTitle', {
              defaultMessage: "Error deleting policy '{id}'",
              values: { id: failedResults[0].id },
            });
        libs.framework.notifications.addDanger(failureMessage);
      }

      if (onSuccessCallback.current) {
        onSuccessCallback.current(successfulResults.map(result => result.id));
      }
    } catch (e) {
      libs.framework.notifications.addDanger(
        i18n.translate('xpack.fleet.deletePolicies.fatalErrorNotificationTitle', {
          defaultMessage: 'Error deleting policies',
        })
      );
    }

    closeModal();
  };

  const fetchAgentsCount = async (policiesToCheck: string[]) => {
    if (isLoadingAgentsCount) {
      return;
    }
    setIsLoadingAgentsCount(true);
    const {
      data: { total },
    } = await sendRequest(libs.httpClient, {
      path: `/api/fleet/agents`,
      method: 'get',
      query: {
        kuery: `agents.policy_id : (${policiesToCheck.join(' or ')})`,
      },
    });
    setAgentsCount(total);
    setIsLoadingAgentsCount(false);
  };

  const renderModal = () => {
    if (!isModalOpen) {
      return null;
    }

    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={
            <FormattedMessage
              id="xpack.fleet.deletePolicies.confirmModal.deleteMultipleTitle"
              defaultMessage="Delete {count, plural, one {this policy} other {# policies}}?"
              values={{ count: policies.length }}
            />
          }
          onCancel={closeModal}
          onConfirm={deletePolicies}
          cancelButtonText={
            <FormattedMessage
              id="xpack.fleet.deletePolicies.confirmModal.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          }
          confirmButtonText={
            isLoading || isLoadingAgentsCount ? (
              <FormattedMessage
                id="xpack.fleet.deletePolicies.confirmModal.loadingButtonLabel"
                defaultMessage="Loading…"
              />
            ) : agentsCount ? (
              <FormattedMessage
                id="xpack.fleet.deletePolicies.confirmModal.confirmAndReassignButtonLabel"
                defaultMessage="Delete {policiesCount, plural, one {policy} other {policies}} and unenroll {agentsCount, plural, one {agent} other {agents}}"
                values={{
                  agentsCount,
                  policiesCount: policies.length,
                }}
              />
            ) : (
              <FormattedMessage
                id="xpack.fleet.deletePolicies.confirmModal.confirmButtonLabel"
                defaultMessage="Delete {policiesCount, plural, one {policy} other {policies}}"
                values={{
                  policiesCount: policies.length,
                }}
              />
            )
          }
          buttonColor="danger"
          confirmButtonDisabled={isLoading || isLoadingAgentsCount}
        >
          {isLoadingAgentsCount ? (
            <FormattedMessage
              id="xpack.fleet.deletePolicies.confirmModal.loadingAgentsCountMessage"
              defaultMessage="Checking amount of affected agents…"
            />
          ) : agentsCount ? (
            <FormattedMessage
              id="xpack.fleet.deletePolicies.confirmModal.affectedAgentsMessage"
              defaultMessage="{agentsCount, plural, one {# agent is} other {# agents are}} assigned {policiesCount, plural, one {to this policy} other {across these policies}}. {agentsCount, plural, one {This agent} other {These agents}} will be unenrolled."
              values={{
                agentsCount,
                policiesCount: policies.length,
              }}
            />
          ) : (
            <FormattedMessage
              id="xpack.fleet.deletePolicies.confirmModal.noAffectedAgentsMessage"
              defaultMessage="There are no agents assigned to {policiesCount, plural, one {this policy} other {these policies}}."
              values={{
                policiesCount: policies.length,
              }}
            />
          )}
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  };

  return (
    <Fragment>
      {children(deletePoliciesPrompt)}
      {renderModal()}
    </Fragment>
  );
};
