/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiTitle,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiDescriptionList,
  EuiButton,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Agent } from '../../../../common/types/domain_data';
import { ConnectedLink, AgentHealth, AgentUnenrollProvider } from '../../../components';
import { AgentMetadataFlyout } from './metadata_flyout';
import { useAgentRefresh } from '../hooks';

const Item: React.FC<{ label: string }> = ({ label, children }) => {
  return (
    <EuiFlexItem grow={false}>
      <EuiDescriptionList compressed>
        <EuiDescriptionListTitle>{label}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>{children}</EuiDescriptionListDescription>
      </EuiDescriptionList>
    </EuiFlexItem>
  );
};

function useFlyout() {
  const [isVisible, setVisible] = useState(false);
  return {
    isVisible,
    show: () => setVisible(true),
    hide: () => setVisible(false),
  };
}

interface Props {
  agent: Agent;
}
export const AgentDetailSection: React.FC<Props> = ({ agent }) => {
  const metadataFlyout = useFlyout();
  const refreshAgent = useAgentRefresh();

  const items = [
    {
      title: i18n.translate('xpack.fleet.agentDetails.statusLabel', {
        defaultMessage: 'Status',
      }),
      description: <AgentHealth agent={agent} />,
    },
    {
      title: i18n.translate('xpack.fleet.agentDetails.idLabel', {
        defaultMessage: 'ID',
      }),
      description: agent.id,
    },
    {
      title: i18n.translate('xpack.fleet.agentDetails.typeLabel', {
        defaultMessage: 'Type',
      }),
      description: agent.type,
    },
    {
      title: i18n.translate('xpack.fleet.agentDetails.policyLabel', {
        defaultMessage: 'Policy',
      }),
      description: (
        <ConnectedLink color="primary" path={`/policies/${agent.policy_id}`}>
          {agent.policy_id}
        </ConnectedLink>
      ),
    },
  ];

  return (
    <>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle size="l">
            <h1>
              <FormattedMessage
                id="xpack.fleet.agentDetails.agentDetailsTitle"
                defaultMessage="Agent detail"
              />
            </h1>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <AgentUnenrollProvider>
            {unenrollAgentsPrompt => (
              <EuiButton
                disabled={!agent.active}
                onClick={() => {
                  unenrollAgentsPrompt([agent.id], 1, refreshAgent);
                }}
              >
                <FormattedMessage
                  id="xpack.fleet.agentDetails.unenrollButtonText"
                  defaultMessage="Unenroll"
                />
              </EuiButton>
            )}
          </AgentUnenrollProvider>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size={'xl'} />
      <EuiFlexGroup alignItems="flexStart" justifyContent="spaceBetween">
        {items.map((item, idx) => (
          <Item key={idx} label={item.title}>
            {item.description}
          </Item>
        ))}
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={() => metadataFlyout.show()}>View metadata</EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      {metadataFlyout.isVisible && <AgentMetadataFlyout flyout={metadataFlyout} agent={agent} />}
    </>
  );
};
