/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCodeBlock,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../common/telemetry';

interface ConnectAgentPanelProps {
  prompt: string;
}

const copyPromptCopiedMessage = i18n.translate(
  'xpack.contextEngine.aiIndexDetail.onboarding.connectAgent.copyPromptSuccessToast',
  { defaultMessage: 'Prompt copied to clipboard' }
);

export const ConnectAgentPanel = ({ prompt }: ConnectAgentPanelProps) => {
  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj="contextOnboardingConnectAgentPanel">
      <EuiFlexGroup gutterSize="xl" responsive wrap alignItems="center">
        <EuiFlexItem grow={3}>
          <EuiTitle size="s">
            <h2>
              <FormattedMessage
                id="xpack.contextEngine.aiIndexDetail.onboarding.connectAgent.title"
                defaultMessage="Connect your coding agent"
              />
            </h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>
              <FormattedMessage
                id="xpack.contextEngine.aiIndexDetail.onboarding.connectAgent.description"
                defaultMessage="Paste this prompt into Claude Code, Cursor, Codex, or another coding agent. It explains this AI index, the APIs your agent can call, and how to start storing memories and Knowledge Indicators."
              />
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize="none" responsive={false} alignItems="flexStart">
            <EuiFlexItem grow={false}>
              <EuiCopy textToCopy={prompt} afterMessage={copyPromptCopiedMessage}>
                {(copy) => (
                  <EuiButton
                    size="s"
                    fill
                    color="primary"
                    iconType="copy"
                    onClick={copy}
                    data-test-subj="contextOnboardingCopyPromptButton"
                    {...getEbtProps({
                      element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageOnboardingPanel,
                      action: CONTEXT_ENGINE_UI_EBT.action.onboarding.COPY_PROMPT,
                    })}
                  >
                    <FormattedMessage
                      id="xpack.contextEngine.aiIndexDetail.onboarding.connectAgent.copyPromptButton"
                      defaultMessage="Copy prompt"
                    />
                  </EuiButton>
                )}
              </EuiCopy>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={5}>
          <EuiPanel color="subdued" paddingSize="none">
            <EuiCodeBlock
              language="markdown"
              overflowHeight={300}
              fontSize="s"
              paddingSize="m"
              lineNumbers
              data-test-subj="contextOnboardingPromptCodeBlock"
            >
              {prompt}
            </EuiCodeBlock>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
