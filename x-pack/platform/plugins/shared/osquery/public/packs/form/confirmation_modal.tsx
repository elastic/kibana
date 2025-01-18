/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiConfirmModal, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

interface ConfirmDeployAgentPolicyModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  agentCount: number;
  agentPolicyCount: number;
}

const ConfirmDeployAgentPolicyModalComponent: React.FC<ConfirmDeployAgentPolicyModalProps> = ({
  onConfirm,
  onCancel,
  agentCount,
  agentPolicyCount,
}) => (
  <EuiConfirmModal
    title={
      <FormattedMessage
        id="xpack.osquery.agentPolicy.confirmModalTitle"
        defaultMessage="Save and deploy changes"
      />
    }
    onCancel={onCancel}
    onConfirm={onConfirm}
    cancelButtonText={
      <FormattedMessage
        id="xpack.osquery.agentPolicy.confirmModalCancelButtonLabel"
        defaultMessage="Cancel"
      />
    }
    confirmButtonText={
      <FormattedMessage
        id="xpack.osquery.agentPolicy.confirmModalConfirmButtonLabel"
        defaultMessage="Save and deploy changes"
      />
    }
    buttonColor="primary"
  >
    <EuiCallOut
      iconType="iInCircle"
      title={i18n.translate('xpack.osquery.agentPolicy.confirmModalCalloutTitle', {
        defaultMessage:
          'This action will update {agentCount, plural, one {# agent} other {# agents}}',
        values: {
          agentCount,
        },
      })}
    >
      <div className="eui-textBreakWord">
        <FormattedMessage
          id="xpack.osquery.agentPolicy.confirmModalCalloutDescription"
          defaultMessage="Fleet has detected that the selected {agentPolicyCount, plural, one {agent policy} other {agent policies}}, is already in use by
            some of your agents. As a result of this action, Fleet will deploy updates to all agents
            that use this {agentPolicyCount, plural, one {agent policy} other {agent policies}}."
          // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
          values={{
            agentPolicyCount,
          }}
        />
      </div>
    </EuiCallOut>
    <EuiSpacer size="l" />
    <FormattedMessage
      id="xpack.osquery.agentPolicy.confirmModalDescription"
      defaultMessage="Are you sure you wish to continue?"
    />
  </EuiConfirmModal>
);

export const ConfirmDeployAgentPolicyModal = React.memo(ConfirmDeployAgentPolicyModalComponent);
