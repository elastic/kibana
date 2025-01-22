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
  EuiCallOut,
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

export interface ManageAutoUpgradeAgentsModalProps {
  onClose: (refreshPolicy: boolean) => void;
  agentPolicy: AgentPolicy;
  agentCount: number;
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
          {agentCount > 0 ? (
            <>
              <EuiCallOut
                iconType="iInCircle"
                title={i18n.translate('xpack.fleet.manageAutoUpgradeAgents.calloutTitle', {
                  defaultMessage:
                    'This action will update {agentCount, plural, one {# agent} other {# agents}}',
                  values: {
                    agentCount,
                  },
                })}
              />
              <EuiSpacer size="m" />
            </>
          ) : null}
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
}> = ({ agentsAvailableVersions, requiredVersion, onRemove, onUpdate }) => {
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
    <EuiFlexGroup direction="row" alignItems="flexEnd">
      <EuiFlexItem>
        <EuiFormRow
          label={
            <>
              <FormattedMessage
                id="xpack.fleet.manageAutoUpgradeAgents.targetAgentVersionTitle"
                defaultMessage="Target agent version"
              />
              <EuiIconTip
                type="iInCircle"
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
                type="iInCircle"
                content={
                  <FormattedMessage
                    data-test-subj="percentageTooltip"
                    id="xpack.fleet.manageAutoUpgradeAgents.percentageTooltip"
                    defaultMessage="Set 100 to upgrade all agents in the policy."
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
