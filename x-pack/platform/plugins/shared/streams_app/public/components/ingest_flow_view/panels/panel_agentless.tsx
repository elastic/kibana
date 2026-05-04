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

type AgentlessIntegrationNode = Extract<FlowNode, { kind: 'agentlessIntegration' }>;

interface PanelAgentlessProps {
  node: AgentlessIntegrationNode;
  onClose: () => void;
}

export const PanelAgentless: React.FC<PanelAgentlessProps> = ({ node }) => {
  const {
    core: { application },
  } = useKibana();

  const listItems = [
    {
      title: i18n.translate('xpack.streams.ingestFlow.panelAgentless.packageName', {
        defaultMessage: 'Package name',
      }),
      description: node.packageName,
    },
    {
      title: i18n.translate('xpack.streams.ingestFlow.panelAgentless.autoPolicyId', {
        defaultMessage: 'Auto policy ID',
      }),
      description: node.autoPolicyId,
    },
    {
      title: i18n.translate('xpack.streams.ingestFlow.panelAgentless.status', {
        defaultMessage: 'Status',
      }),
      description: node.health?.status ?? 'unknown',
    },
  ];

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            {i18n.translate('xpack.streams.ingestFlow.panelAgentless.title', {
              defaultMessage: '{title} (agentless)',
              values: { title: node.packageTitle },
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
              iconType="pencil"
              onClick={() =>
                application.navigateToApp('integrations', {
                  path: `/edit-integration/${node.packagePolicyId}`,
                })
              }
            >
              {i18n.translate('xpack.streams.ingestFlow.panelAgentless.editIntegrationButton', {
                defaultMessage: 'Edit integration',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
