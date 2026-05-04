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

type AgentNode = Extract<FlowNode, { kind: 'agent' }>;

interface PanelAgentProps {
  node: AgentNode;
  onClose: () => void;
}

export const PanelAgent: React.FC<PanelAgentProps> = ({ node }) => {
  const {
    core: { application },
  } = useKibana();

  const listItems = [
    {
      title: i18n.translate('xpack.streams.ingestFlow.panelAgent.agentId', {
        defaultMessage: 'Agent ID',
      }),
      description: node.agentId,
    },
    {
      title: i18n.translate('xpack.streams.ingestFlow.panelAgent.policyId', {
        defaultMessage: 'Policy ID',
      }),
      description: node.policyId,
    },
    {
      title: i18n.translate('xpack.streams.ingestFlow.panelAgent.hostname', {
        defaultMessage: 'Hostname',
      }),
      description: node.hostname,
    },
    {
      title: i18n.translate('xpack.streams.ingestFlow.panelAgent.version', {
        defaultMessage: 'Version',
      }),
      description: `v${node.version}`,
    },
    {
      title: i18n.translate('xpack.streams.ingestFlow.panelAgent.status', {
        defaultMessage: 'Status',
      }),
      description: node.agentStatus,
    },
  ];

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            {i18n.translate('xpack.streams.ingestFlow.panelAgent.title', {
              defaultMessage: 'Agent: {hostname}',
              values: { hostname: node.hostname },
            })}
          </h2>
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
                application.navigateToApp('fleet', { path: `/agents/${node.agentId}` })
              }
            >
              {i18n.translate('xpack.streams.ingestFlow.panelAgent.viewInFleetButton', {
                defaultMessage: 'View in Fleet',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
