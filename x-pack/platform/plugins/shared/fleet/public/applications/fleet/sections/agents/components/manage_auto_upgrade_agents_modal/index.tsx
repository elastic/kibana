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
  EuiFormRow,
  EuiSpacer,
  EuiSuperSelect,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { AgentTargetVersion } from '../../../../../../../common/types';

import type { AgentPolicy } from '../../../../../../../common';
import {
  sendUpdateAgentPolicy,
  useGetAgentsAvailableVersionsQuery,
  useStartServices,
} from '../../../../../../hooks';

export interface ManageAutoUpgradeAgentsModalProps {
  onClose: () => void;
  agentPolicy: AgentPolicy;
}

export const ManageAutoUpgradeAgentsModal: React.FunctionComponent<
  ManageAutoUpgradeAgentsModalProps
> = ({ onClose, agentPolicy }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { notifications } = useStartServices();
  const [targetVersions, setTargetVersions] = useState(agentPolicy.required_versions || []);
  const { data: agentsAvailableVersions } = useGetAgentsAvailableVersionsQuery({
    enabled: true,
  });

  const submitUpdateAgentPolicy = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await sendUpdateAgentPolicy(agentPolicy.id, {
        name: agentPolicy.name,
        namespace: agentPolicy.namespace,
        required_versions: targetVersions,
      });
      if (data) {
        notifications.toasts.addSuccess(
          i18n.translate('xpack.fleet.manageAutoUpgradeAgents.successNotificationTitle', {
            defaultMessage: "Successfully updated ''{name}'' auto-upgrade agents settings",
            values: { name: agentPolicy.name },
          })
        );
      } else {
        notifications.toasts.addDanger(
          error
            ? error.message
            : i18n.translate('xpack.fleet.manageAutoUpgradeAgents.errorNotificationTitle', {
                defaultMessage: 'Unable to update agent policy',
              })
        );
      }
    } catch (e) {
      notifications.toasts.addDanger(
        i18n.translate('xpack.fleet.manageAutoUpgradeAgents.errorNotificationTitle', {
          defaultMessage: 'Unable to update agent policy',
        })
      );
    }
    setIsLoading(false);
  };

  async function onSubmit() {
    // TODO warn on affected agents
    await submitUpdateAgentPolicy();
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
      onCancel={onClose}
      onConfirm={onSubmit}
      confirmButtonDisabled={isLoading}
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
          {targetVersions.map((requiredVersion, index) => (
            <>
              <TargetVersionsRow
                agentsAvailableVersions={agentsAvailableVersions?.items || []}
                requiredVersion={requiredVersion}
                key={index}
                onRemove={() => {
                  setTargetVersions(targetVersions.filter((_, i) => i !== index));
                }}
                onUpdate={(version: string, percentage: number) => {
                  setTargetVersions(
                    targetVersions.map((targetVersion, i) =>
                      i === index ? { version, percentage } : targetVersion
                    )
                  );
                }}
              />
              <EuiSpacer size="s" />
            </>
          ))}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow>
            <EuiButtonEmpty
              onClick={() => {
                setTargetVersions([...targetVersions, { version: '', percentage: 100 }]);
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

  const [version, setVersion] = useState(requiredVersion.version || options[1].value);

  const onVersionChange = (value: string) => {
    setVersion(value);
  };

  const [percentage, setPercentage] = useState(requiredVersion.percentage || 100);

  const onPercentageChange = (value: number) => {
    setPercentage(value);
  };

  return (
    <EuiFlexGroup direction="row" alignItems="center">
      <EuiFlexItem>
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.fleet.manageAutoUpgradeAgents.targetAgentVersionTitle"
              defaultMessage="Target agent version"
            />
          }
          helpText=""
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
            <FormattedMessage
              id="xpack.fleet.manageAutoUpgradeAgents.percentageTitle"
              defaultMessage="% of agents to upgrade"
            />
          }
          helpText={percentage === 100 ? 'Upgrading all of agents in policy' : ''}
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
