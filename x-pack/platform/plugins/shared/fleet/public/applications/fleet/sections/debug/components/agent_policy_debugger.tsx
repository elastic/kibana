/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiCode,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { useQuery } from '@tanstack/react-query';

import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { sendGetAgentPolicies, useLink } from '../../../hooks';

import { policyHasFleetServer } from '../../../services';
import type { AgentPolicy } from '../../../types';
import { AgentPolicyDeleteProvider } from '../../agent_policy/components';

import { queryClient } from '..';

import { CodeBlock } from './code_block';

const fetchAgentPolicies = async () => {
  const response = await sendGetAgentPolicies({
    full: true,
    perPage: 100,
    sortOrder: 'asc',
  });

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response;
};

export const AgentPolicyDebugger: React.FunctionComponent = () => {
  const { getHref } = useLink();
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>();

  // TODO: Depending on the number of agent policies, this might need to be switched to
  // `useInfinite` query with an infinite scrolling approach in the dropdown options.
  const { data, status } = useQuery(['debug-agent-policies'], fetchAgentPolicies);

  const agentPolicies = data?.data?.items ?? [];
  const comboBoxOptions = agentPolicies.map((policy) => ({
    label: `${policy.name} - ${policy.id}`,
    value: policy.id,
  }));

  const selectedOptions = selectedPolicyId
    ? [comboBoxOptions.find((option) => option.value === selectedPolicyId)!]
    : [];

  const selectedAgentPolicy = agentPolicies.find((policy) => policy.id === selectedPolicyId);

  const onDelete = () => {
    setSelectedPolicyId(undefined);
    queryClient.invalidateQueries(['debug-agent-policies']);
  };

  if (status === 'error') {
    return (
      <EuiCallOut title="Error" color="danger">
        <FormattedMessage
          id="xpack.fleet.debug.agentPolicyDebugger.fetchError"
          defaultMessage="Error fetching Agent Policies"
        />
      </EuiCallOut>
    );
  }

  return (
    <>
      <EuiText grow={false}>
        <p>
          <FormattedMessage
            id="xpack.fleet.debug.agentPolicyDebugger.description"
            defaultMessage="Search for an Agent Policy using its name or {codeId} value. Use the code block below to diagnose any potential issues with the policy's configuration."
            values={{ codeId: <EuiCode>id</EuiCode> }}
          />
        </p>
      </EuiText>

      <EuiSpacer size="m" />

      <EuiFlexGroup alignItems="center" justifyContent="flexStart">
        <EuiFlexItem
          grow={false}
          css={`
            min-width: 600px;
          `}
        >
          <EuiComboBox
            aria-label={i18n.translate('xpack.fleet.debug.agentPolicyDebugger.selectLabel', {
              defaultMessage: 'Select an Agent Policy',
            })}
            placeholder={i18n.translate('xpack.fleet.debug.agentPolicyDebugger.selectLabel', {
              defaultMessage: 'Select an Agent Policy',
            })}
            fullWidth
            options={comboBoxOptions}
            singleSelection={{ asPlainText: true }}
            selectedOptions={selectedOptions}
            isLoading={status === 'loading'}
            onChange={(newSelectedOptions) => {
              // Handle "clear" action
              if (!newSelectedOptions.length) {
                setSelectedPolicyId(undefined);
              } else {
                setSelectedPolicyId(newSelectedOptions[0].value);
              }
            }}
          />
        </EuiFlexItem>

        {selectedPolicyId && (
          <AgentPolicyDeleteProvider
            agentPolicy={selectedAgentPolicy as AgentPolicy}
            hasFleetServer={policyHasFleetServer(selectedAgentPolicy as AgentPolicy)}
          >
            {(deleteAgentPolicyPrompt) => {
              return (
                <EuiFlexItem grow={false}>
                  <div>
                    <EuiButton
                      color="danger"
                      onClick={() => deleteAgentPolicyPrompt(selectedPolicyId, onDelete)}
                    >
                      <FormattedMessage
                        id="xpack.fleet.policyForm.deletePolicyActionText"
                        defaultMessage="Delete policy"
                      />
                    </EuiButton>
                  </div>
                </EuiFlexItem>
              );
            }}
          </AgentPolicyDeleteProvider>
        )}
      </EuiFlexGroup>

      {selectedPolicyId && (
        <>
          <EuiSpacer size="m" />

          <EuiLink target="_blank" href={getHref('policy_details', { policyId: selectedPolicyId })}>
            <FormattedMessage
              id="xpack.fleet.debug.agentPolicyDebugger.viewAgentPolicyLink"
              defaultMessage="View Agent Policy in Fleet UI"
            />
          </EuiLink>

          <EuiSpacer size="m" />

          <CodeBlock value={JSON.stringify(selectedAgentPolicy, null, 2)} />
        </>
      )}
    </>
  );
};
