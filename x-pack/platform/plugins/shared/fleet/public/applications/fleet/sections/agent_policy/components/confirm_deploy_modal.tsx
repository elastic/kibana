/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal, EuiSpacer, useGeneratedHtmlId } from '@elastic/eui';
import { KbnInfoCallout } from '@kbn/ui-callout';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import type { AgentPolicy } from '../../../types';

export const ConfirmDeployAgentPolicyModal: React.FunctionComponent<{
  onConfirm: () => void;
  onCancel: () => void;
  agentCount: number;
  agentPolicies: AgentPolicy[];
  agentPoliciesToAdd?: string[];
  agentPoliciesToRemove?: string[];
}> = ({
  onConfirm,
  onCancel,
  agentCount,
  agentPolicies,
  agentPoliciesToAdd = [],
  agentPoliciesToRemove = [],
}) => {
  const modalTitleId = useGeneratedHtmlId();
  return agentPolicies.length === 0 && agentPoliciesToRemove.length === 0 ? (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      titleProps={{ id: modalTitleId }}
      title={
        <FormattedMessage
          id="xpack.fleet.agentPolicy.noPolicies.confirmModalTitle"
          defaultMessage="Save changes"
        />
      }
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={
        <FormattedMessage
          id="xpack.fleet.agentPolicy.noPolicies.confirmModalCancelButtonLabel"
          defaultMessage="Cancel"
        />
      }
      confirmButtonText={
        <FormattedMessage
          id="xpack.fleet.agentPolicy.noPolicies.confirmModalConfirmButtonLabel"
          defaultMessage="Save changes"
        />
      }
      buttonColor="primary"
    >
      <KbnInfoCallout
        announceOnMount
        data-test-subj="confirmNoPoliciesCallout"
        title={i18n.translate('xpack.fleet.agentPolicy.noPolicies.confirmModalCalloutTitle', {
          defaultMessage: 'No agent policies selected',
        })}
        text={
          <div className="eui-textBreakWord">
            <FormattedMessage
              id="xpack.fleet.agentPolicy.noPolicies.confirmModalCalloutDescription"
              defaultMessage="This integration will not be added to any agent policies."
            />
          </div>
        }
      />
    </EuiConfirmModal>
  ) : (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      titleProps={{ id: modalTitleId }}
      title={
        <FormattedMessage
          id="xpack.fleet.agentPolicy.confirmModalTitle"
          defaultMessage="Save and deploy changes"
        />
      }
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={
        <FormattedMessage
          id="xpack.fleet.agentPolicy.confirmModalCancelButtonLabel"
          defaultMessage="Cancel"
        />
      }
      confirmButtonText={
        <FormattedMessage
          id="xpack.fleet.agentPolicy.confirmModalConfirmButtonLabel"
          defaultMessage="Save and deploy changes"
        />
      }
      buttonColor="primary"
    >
      {agentCount > 0 ? (
        <KbnInfoCallout
          announceOnMount
          title={i18n.translate('xpack.fleet.agentPolicy.confirmModalCalloutTitle', {
            defaultMessage:
              'This action will update {agentCount, plural, one {# agent} other {# agents}}',
            values: {
              agentCount,
            },
          })}
          text={
            <div className="eui-textBreakWord">
              <FormattedMessage
                id="xpack.fleet.agentPolicy.confirmModalCalloutDescription"
                defaultMessage="Fleet has detected that the selected agent policies, {policyNames}, are already in use by
            some of your agents. As a result of this action, Fleet will deploy updates to all agents
            that use these policies."
                values={{
                  policyNames: <b>{agentPolicies.map((policy) => policy.name).join(', ')}</b>,
                }}
              />
            </div>
          }
        />
      ) : (
        <KbnInfoCallout
          announceOnMount
          data-test-subj="confirmAddRemovePoliciesCallout"
          title={i18n.translate('xpack.fleet.agentPolicy.confirmModalPoliciesCalloutTitle', {
            defaultMessage: 'This action will update the selected agent policies',
          })}
        >
          {agentPoliciesToAdd.length > 0 && (
            <div className="eui-textBreakWord">
              <FormattedMessage
                id="xpack.fleet.agentPolicy.confirmModalPoliciesAddCalloutDescription"
                defaultMessage="Agent policies that will be updated to use this integration policy:"
              />
              <ul>
                {agentPoliciesToAdd.map((policy) => (
                  <li key={policy}>{policy}</li>
                ))}
              </ul>
            </div>
          )}
          {agentPoliciesToRemove.length > 0 && (
            <div className="eui-textBreakWord">
              <FormattedMessage
                id="xpack.fleet.agentPolicy.confirmModalPoliciesRemoveCalloutDescription"
                defaultMessage="Agent policies that will be updated to remove this integration policy:"
              />
              <ul>
                {agentPoliciesToRemove.map((policy) => (
                  <li key={policy}>{policy}</li>
                ))}
              </ul>
            </div>
          )}
        </KbnInfoCallout>
      )}
      <EuiSpacer size="l" />
      <FormattedMessage
        id="xpack.fleet.agentPolicy.confirmModalDescription"
        defaultMessage="This action can not be undone. Are you sure you wish to continue?"
      />
    </EuiConfirmModal>
  );
};
