/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiConfirmModal,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiIconTip,
  EuiSpacer,
  EuiSuperSelect,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { AgentTargetVersion } from '../../../../../../../common/types';

import type { AgentPolicy } from '../../../../../../../common';
import { useGetAgentsAvailableVersionsQuery, useStartServices } from '../../../../../../hooks';
import { checkTargetVersionsValidity } from '../../../../../../../common/services';
import { sendUpdateAgentPolicyForRq } from '../../../../../../hooks/use_request/agent_policy';

import { StatusColumn } from './status_column';

export interface ManageAutoUpgradeAgentsModalProps {
  onClose: (refreshPolicy: boolean) => void;
  agentPolicy: AgentPolicy;
  agentCount?: number;
}

export const ManageAutoUpgradeAgentsModal: React.FunctionComponent<
  ManageAutoUpgradeAgentsModalProps
> = ({ onClose, agentPolicy, agentCount }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { notifications } = useStartServices();
  const [targetVersions, setTargetVersions] = useState(agentPolicy.required_versions || []);
  const { data: agentsAvailableVersions } = useGetAgentsAvailableVersionsQuery({
    enabled: true,
  });
  const latestVersion = agentsAvailableVersions?.items[0];
  const [errors, setErrors] = useState<string[]>([]);

  const submitUpdateAgentPolicy = async () => {
    setIsLoading(true);
    let isSuccess = false;
    try {
      await sendUpdateAgentPolicyForRq(agentPolicy.id, {
        name: agentPolicy.name,
        namespace: agentPolicy.namespace,
        required_versions: targetVersions,
        // required_versions are not sent to agents, so no need to bump revision
        bumpRevision: false,
      });
      notifications.toasts.addSuccess(
        i18n.translate('xpack.fleet.manageAutoUpgradeAgents.successNotificationTitle', {
          defaultMessage: "Successfully updated ''{name}'' auto-upgrade agents settings",
          values: { name: agentPolicy.name },
        })
      );
      isSuccess = true;
    } catch (e) {
      notifications.toasts.addDanger(
        i18n.translate('xpack.fleet.manageAutoUpgradeAgents.errorNotificationTitle', {
          defaultMessage: 'Unable to update agent policy',
        })
      );
    }
    setIsLoading(false);
    onClose(isSuccess);
  };

  async function onSubmit() {
    await submitUpdateAgentPolicy();
  }

  async function updateTargetVersions(newVersions: AgentTargetVersion[]) {
    const error = checkTargetVersionsValidity(newVersions);
    setErrors(error ? [error] : []);

    setTargetVersions(newVersions);
  }

  return (
    <EuiConfirmModal
      data-test-subj="manageAutoUpgradeAgentsModal"
      title={
        <FormattedMessage
          id="xpack.fleet.manageAutoUpgradeAgents.modalTitle"
          defaultMessage="Manage auto-upgrade agents"
        />
      }
      onCancel={() => onClose(false)}
      onConfirm={onSubmit}
      confirmButtonDisabled={isLoading || errors.length > 0}
      cancelButtonText={
        <FormattedMessage
          id="xpack.fleet.manageAutoUpgradeAgents.cancelButtonLabel"
          defaultMessage="Cancel"
        />
      }
      confirmButtonText={
        <FormattedMessage
          id="xpack.fleet.manageAutoUpgradeAgents.saveButtonLabel"
          defaultMessage="Save"
        />
      }
      style={{ width: 1000 }}
    >
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <FormattedMessage
            id="xpack.fleet.manageAutoUpgradeAgents.descriptionText"
            defaultMessage="Add the target agent version for automatic upgrades."
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiForm isInvalid={errors.length > 0} error={errors} component="form">
            {targetVersions.map((requiredVersion, index) => (
              <>
                <TargetVersionsRow
                  agentsAvailableVersions={agentsAvailableVersions?.items || []}
                  requiredVersion={requiredVersion}
                  key={index}
                  onRemove={() => {
                    updateTargetVersions(targetVersions.filter((_, i) => i !== index));
                  }}
                  onUpdate={(version: string, percentage: number) => {
                    updateTargetVersions(
                      targetVersions.map((targetVersion, i) =>
                        i === index ? { version, percentage } : targetVersion
                      )
                    );
                  }}
                  agentPolicyId={agentPolicy.id}
                />
                <EuiSpacer size="s" />
              </>
            ))}
          </EuiForm>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow>
            <EuiButtonEmpty
              onClick={() => {
                updateTargetVersions([
                  ...targetVersions,
                  {
                    version: latestVersion || '',
                    percentage: targetVersions.length === 0 ? 100 : 1,
                  },
                ]);
              }}
              iconType="plusInCircle"
            >
              <FormattedMessage
                id="xpack.fleet.manageAutoUpgradeAgents.addVersionButton"
                defaultMessage="Add target version"
              />
            </EuiButtonEmpty>
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiConfirmModal>
  );
};

const TargetVersionsRow: React.FunctionComponent<{
  agentsAvailableVersions: string[];
  requiredVersion: AgentTargetVersion;
  onRemove: () => void;
  onUpdate: (version: string, percentage: number) => void;
  agentPolicyId: string;
}> = ({ agentsAvailableVersions, requiredVersion, onRemove, onUpdate, agentPolicyId }) => {
  const options = agentsAvailableVersions.map((version) => ({
    value: version,
    inputDisplay: version,
  }));

  const [version, setVersion] = useState(requiredVersion.version);

  const onVersionChange = (value: string) => {
    setVersion(value);
  };

  const [percentage, setPercentage] = useState(requiredVersion.percentage);

  const onPercentageChange = (value: number) => {
    setPercentage(value);
  };

  return (
    <EuiFlexGroup direction="row" alignItems="stretch">
      <EuiFlexItem>
        <EuiFormRow
          label={
            <>
              <FormattedMessage
                id="xpack.fleet.manageAutoUpgradeAgents.targetAgentVersionTitle"
                defaultMessage="Target agent version"
              />
              <EuiIconTip
                type="info"
                content={
                  <FormattedMessage
                    data-test-subj="targetVersionTooltip"
                    id="xpack.fleet.manageAutoUpgradeAgents.targetVersionTooltip"
                    defaultMessage="You can only downgrade agents manually."
                  />
                }
              />
            </>
          }
        >
          <EuiSuperSelect
            options={options}
            valueOfSelected={version}
            onChange={(value) => {
              onVersionChange(value);
              onUpdate(value, percentage);
            }}
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFormRow
          label={
            <>
              <FormattedMessage
                id="xpack.fleet.manageAutoUpgradeAgents.percentageTitle"
                defaultMessage="% of agents to upgrade"
              />
              <EuiIconTip
                type="info"
                title={'Rounding Applied'}
                content={
                  <FormattedMessage
                    data-test-subj="percentageTooltip"
                    id="xpack.fleet.manageAutoUpgradeAgents.percentageTooltip"
                    defaultMessage="The actual percentage of agents upgraded may vary slightly due to rounding. For example, selecting 30% of 25 agents may result in 8 agents being upgraded (32%)."
                  />
                }
              />
            </>
          }
        >
          <EuiFieldNumber
            value={percentage}
            onChange={(e) => {
              const newValue = parseInt(e.target.value, 10);
              onPercentageChange(newValue);
              onUpdate(version, newValue);
            }}
            min={0}
            step={1}
            max={100}
            required
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.fleet.manageAutoUpgradeAgents.statusTitle"
              defaultMessage="Status"
            />
          }
        >
          <StatusColumn agentPolicyId={agentPolicyId} version={version} percentage={percentage} />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem style={{ 'align-self': 'end' }}>
        <EuiFormRow label="">
          <EuiButton onClick={onRemove} color="text">
            <FormattedMessage
              id="xpack.fleet.manageAutoUpgradeAgents.removeVersionButton"
              defaultMessage="Remove"
            />
          </EuiButton>
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
