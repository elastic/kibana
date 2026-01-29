/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
  EuiComboBox,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import type { AgentPolicy } from '../../types';
import { AgentPolicyPackageBadges } from '../agent_policy_package_badges';

import { useAuthz, useStartServices } from '../../hooks';

import { AdvancedAgentAuthenticationSettings } from './advanced_agent_authentication_settings';

const AgentPolicyFormRow = styled(EuiFormRow)`
  .euiFormRow__label {
    width: 100%;
  }
`;

type Props = {
  agentPolicies: Array<Pick<AgentPolicy, 'id' | 'name' | 'supports_agentless'>>;
  selectedPolicyId?: string;
  setSelectedPolicyId: (agentPolicyId?: string) => void;
  excludeFleetServer?: boolean;
  onClickCreatePolicy: () => void;
  isFleetServerPolicy?: boolean;
} & (
  | {
      withKeySelection: true;
      selectedApiKeyId?: string;
      onKeyChange?: (key?: string) => void;
    }
  | {
      withKeySelection: false;
    }
);

export const AgentPolicySelection: React.FC<Props> = (props) => {
  const { docLinks } = useStartServices();

  const {
    agentPolicies,
    selectedPolicyId,
    setSelectedPolicyId,
    excludeFleetServer,
    onClickCreatePolicy,
    isFleetServerPolicy,
  } = props;

  const authz = useAuthz();

  // Memoize options to avoid recreating them on every render.
  // Important for performance when users have many policies.
  const policyOptions = useMemo(
    () =>
      agentPolicies
        .filter((policy) => !policy?.supports_agentless)
        .map((agentPolicy) => ({
          value: agentPolicy.id,
          label: agentPolicy.name,
        })),
    [agentPolicies]
  );

  // Memoize selected options to avoid unnecessary EuiComboBox re-renders
  const selectedOptions = useMemo(() => {
    if (!selectedPolicyId) return [];
    const option = policyOptions.find((opt) => opt.value === selectedPolicyId);
    return option ? [option] : [];
  }, [selectedPolicyId, policyOptions]);

  return (
    <>
      <EuiText>
        {isFleetServerPolicy ? (
          <FormattedMessage
            id="xpack.fleet.enrollmentStepAgentPolicy.selectAgentPolicyFleetServerText"
            defaultMessage="Fleet Server runs on Elastic Agent, and agents are enrolled in agent policies which represent hosts. You can select an existing agent policy configured for Fleet Server, or you may choose to create a new one."
          />
        ) : (
          <FormattedMessage
            id="xpack.fleet.enrollmentStepAgentPolicy.createAgentPolicyText"
            defaultMessage="Settings for the monitored host are configured in the {agentPolicy}. Choose an agent policy or create a new one."
            values={{
              agentPolicy: (
                <EuiLink href={docLinks.links.fleet.agentPolicy} target="_blank">
                  <FormattedMessage
                    id="xpack.fleet.agentPolicyForm.createAgentPolicyDocLink"
                    defaultMessage="agent policy"
                  />
                </EuiLink>
              ),
            }}
          />
        )}
      </EuiText>
      <EuiSpacer size="m" />
      <AgentPolicyFormRow
        fullWidth
        label={
          authz.fleet.allAgentPolicies && (
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiLink onClick={onClickCreatePolicy} data-test-subj="createNewAgentPolicyLink">
                  <FormattedMessage
                    id="xpack.fleet.enrollmentStepAgentPolicy.addPolicyButton"
                    defaultMessage="Create new agent policy"
                  />
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
          )
        }
      >
        <EuiComboBox
          fullWidth
          isLoading={!agentPolicies}
          options={policyOptions}
          selectedOptions={selectedOptions}
          onChange={(newOptions) => {
            if (newOptions.length) {
              setSelectedPolicyId(newOptions[0].value);
            } else {
              setSelectedPolicyId(undefined);
            }
          }}
          singleSelection={{ asPlainText: true }}
          aria-label={i18n.translate(
            'xpack.fleet.enrollmentStepAgentPolicy.policySelectAriaLabel',
            {
              defaultMessage: 'Agent policy',
            }
          )}
          data-test-subj="agentPolicyDropdown"
          isInvalid={!selectedPolicyId}
          isClearable={true}
        />
      </AgentPolicyFormRow>
      {authz.fleet.readAgentPolicies && selectedPolicyId && !isFleetServerPolicy && (
        <>
          <EuiSpacer size="m" />
          <AgentPolicyPackageBadges
            agentPolicyId={selectedPolicyId}
            excludeFleetServer={excludeFleetServer}
          />
        </>
      )}
      {props.withKeySelection && props.onKeyChange && selectedPolicyId && (
        <>
          <EuiSpacer size="m" />
          <AdvancedAgentAuthenticationSettings
            selectedApiKeyId={props.selectedApiKeyId}
            onKeyChange={props.onKeyChange}
            initialAuthenticationSettingsOpen={!props.selectedApiKeyId}
            agentPolicyId={selectedPolicyId}
          />
        </>
      )}
    </>
  );
};
