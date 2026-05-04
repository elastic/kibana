/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { FlowNode } from '@kbn/streams-plugin/common';
import { useKibana } from '../../../hooks/use_kibana';

type AgentPolicyNode = Extract<FlowNode, { kind: 'agentPolicy' }>;

interface PanelAgentPolicyProps {
  node: AgentPolicyNode;
  onClose: () => void;
}

export const PanelAgentPolicy: React.FC<PanelAgentPolicyProps> = ({ node }) => {
  const {
    core: { application },
  } = useKibana();

  const listItems = [
    {
      title: i18n.translate('xpack.streams.ingestFlow.panelAgentPolicy.policyId', {
        defaultMessage: 'Policy ID',
      }),
      description: node.policyId,
    },
    {
      title: i18n.translate('xpack.streams.ingestFlow.panelAgentPolicy.agentCount', {
        defaultMessage: 'Agent count',
      }),
      description: String(node.agentCount),
    },
  ];

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{node.policyId}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiDescriptionList listItems={listItems} type="column" columnWidths={[1, 2]} />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              iconType="popout"
              onClick={() =>
                application.navigateToApp('fleet', { path: `/policies/${node.policyId}` })
              }
            >
              {i18n.translate('xpack.streams.ingestFlow.panelAgentPolicy.viewPolicyButton', {
                defaultMessage: 'View policy',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
