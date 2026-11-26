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
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHomeConfig, useHomeServices, useTelemetryId } from '../context';
import { ConnectionDetails } from './connection_details';
import { PromptModal } from './prompt_modal';

export const IntegratedHomeHeader = () => {
  const { cloud, docLinks } = useHomeServices();
  const { ideSetup } = useHomeConfig();
  const getTelemetryId = useTelemetryId();
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const projectName = cloud?.serverless.projectName;
  const isServerless = cloud?.isServerlessEnabled === true;

  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj="elasticsearchHomeHeader">
      {projectName && (
        <>
          <EuiText size="s" data-test-subj="elasticsearchHomeHeaderProjectName">
            <p>{projectName}</p>
          </EuiText>
          <EuiSpacer size="m" />
        </>
      )}
      <EuiTitle size="m">
        <h1>
          {isServerless
            ? i18n.translate('xpack.elasticsearchHome.integratedHome.header.projectTitle', {
                defaultMessage: 'Your project is ready for data.',
              })
            : i18n.translate('xpack.elasticsearchHome.integratedHome.header.clusterTitle', {
                defaultMessage: 'Your cluster is ready for data.',
              })}
        </h1>
      </EuiTitle>
      <EuiSpacer size="m" />
      <ConnectionDetails />
      <EuiSpacer size="m" />
      <EuiText size="m">
        <p>
          {i18n.translate('xpack.elasticsearchHome.integratedHome.header.description', {
            defaultMessage:
              'Start by connecting your application to add data and build your search experience.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            iconType="sparkles"
            onClick={() => setIsPromptModalOpen(true)}
            data-test-subj="elasticsearchHomeHeaderPromptAgentButton"
            data-telemetry-id={getTelemetryId('header-promptAgent')}
          >
            {i18n.translate('xpack.elasticsearchHome.integratedHome.header.promptAgent', {
              defaultMessage: 'Prompt your agent',
            })}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            color="text"
            href={docLinks.links.agentBuilder.mcpServer}
            target="_blank"
            data-test-subj="elasticsearchHomeHeaderInstallMcpButton"
            data-telemetry-id={getTelemetryId('header-installMcp')}
          >
            {i18n.translate('xpack.elasticsearchHome.integratedHome.header.installMcp', {
              defaultMessage: 'Install the MCP',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      {isPromptModalOpen && (
        <PromptModal prompt={ideSetup.prompt} onClose={() => setIsPromptModalOpen(false)} />
      )}
    </EuiPanel>
  );
};
