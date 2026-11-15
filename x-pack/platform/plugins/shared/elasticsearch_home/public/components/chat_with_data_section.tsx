/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AiButton } from '@kbn/shared-ux-ai-components';
import { anthropicIcon, cursorIcon, visualStudioCodeIcon } from '@kbn/custom-icons';
import { useHomeConfig, useHomeServices, useTelemetryId } from '../context';
import { PromptModal } from './prompt_modal';
import { brandIcon } from './chat_with_data_section_styles';

const BRAND_ICONS = [
  {
    key: 'anthropic',
    icon: anthropicIcon,
    title: i18n.translate('xpack.elasticsearchHome.home.chat.anthropicIcon', {
      defaultMessage: 'Anthropic Claude Code logo',
    }),
  },
  {
    key: 'cursor',
    icon: cursorIcon,
    title: i18n.translate('xpack.elasticsearchHome.home.chat.cursorIcon', {
      defaultMessage: 'Cursor AI logo',
    }),
  },
  {
    key: 'vsCode',
    icon: visualStudioCodeIcon,
    title: i18n.translate('xpack.elasticsearchHome.home.chat.vsCodeIcon', {
      defaultMessage: 'Visual Studio Code logo',
    }),
  },
];

export const ChatWithYourDataSection = () => {
  const { agentBuilder } = useHomeServices();
  const { ideSetup } = useHomeConfig();
  const getTelemetryId = useTelemetryId();
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={false}>
        <EuiTitle size="xxs">
          <h2>
            {i18n.translate('xpack.elasticsearchHome.home.chat.title', {
              defaultMessage: 'Build in your IDE',
            })}
          </h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('xpack.elasticsearchHome.home.chat.description', {
              defaultMessage: 'Code with context using Elastic-certified skills.',
            })}
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButton
              color="text"
              onClick={() => setIsPromptModalOpen(true)}
              data-test-subj="viewPromptButton"
              data-telemetry-id={getTelemetryId('chat-viewPrompt')}
            >
              {i18n.translate('xpack.elasticsearchHome.home.chat.viewPrompt', {
                defaultMessage: 'View prompt',
              })}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              {BRAND_ICONS.map(({ key, icon, title }) => (
                <EuiFlexItem grow={false} key={key}>
                  <span role="img" aria-label={title} css={brandIcon(icon)} />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="l" />
        <EuiTitle size="xxs">
          <h2>
            {i18n.translate('xpack.elasticsearchHome.home.chat.skipSetupTitle', {
              defaultMessage: 'Skip the setup and use the Elastic Agent',
            })}
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <span>
          <AiButton
            variant="outlined"
            iconType="productAgent"
            onClick={() =>
              agentBuilder.openChat({
                initialMessage: ideSetup.agentInitialMessage,
                autoSendInitialMessage: true,
                newConversation: true,
                sessionTag: ideSetup.agentSessionTag,
              })
            }
            data-test-subj="openElasticAgentButton"
            data-telemetry-id={getTelemetryId('chat-openElasticAgent')}
          >
            {i18n.translate('xpack.elasticsearchHome.home.chat.openAgent', {
              defaultMessage: 'Chat with AI Agent',
            })}
          </AiButton>
        </span>
        {isPromptModalOpen && (
          <PromptModal prompt={ideSetup.prompt} onClose={() => setIsPromptModalOpen(false)} />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
