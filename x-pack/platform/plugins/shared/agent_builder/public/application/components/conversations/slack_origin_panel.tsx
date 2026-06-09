/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import React, { useCallback, useState } from 'react';
import { useAgentId } from '../../hooks/use_conversation';
import { useNavigation } from '../../hooks/use_navigation';
import { appPaths } from '../../utils/app_paths';

interface SlackOriginPanelProps {
  /** Duplicates the conversation without the Slack link and returns the new id. */
  onFork: () => Promise<string>;
}

/**
 * Read-only banner shown in place of the message input for conversations that
 * originated from Slack. Offers a "Fork" action that duplicates the conversation
 * into a standalone, editable Agent Builder conversation.
 */
export const SlackOriginPanel: React.FC<SlackOriginPanelProps> = ({ onFork }) => {
  const agentId = useAgentId() ?? agentBuilderDefaultAgentId;
  const { navigateToAgentBuilderUrl } = useNavigation();
  const [isForking, setIsForking] = useState(false);

  const handleFork = useCallback(async () => {
    setIsForking(true);
    try {
      const forkId = await onFork();
      navigateToAgentBuilderUrl(
        appPaths.agent.conversations.byId({ agentId, conversationId: forkId })
      );
    } finally {
      setIsForking(false);
    }
  }, [agentId, navigateToAgentBuilderUrl, onFork]);

  return (
    <EuiCallOut
      color="primary"
      iconType="logoSlack"
      title={i18n.translate('xpack.agentBuilder.slackOrigin.title', {
        defaultMessage: 'This conversation came from Slack',
      })}
    >
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem>
          <EuiText size="s">
            {i18n.translate('xpack.agentBuilder.slackOrigin.description', {
              defaultMessage:
                'It is read-only here. Fork it to continue the conversation in Agent Builder.',
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            iconType="copy"
            size="s"
            onClick={handleFork}
            isLoading={isForking}
            data-test-subj="agentBuilderSlackForkButton"
          >
            {i18n.translate('xpack.agentBuilder.slackOrigin.forkButton', {
              defaultMessage: 'Fork conversation',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
};
