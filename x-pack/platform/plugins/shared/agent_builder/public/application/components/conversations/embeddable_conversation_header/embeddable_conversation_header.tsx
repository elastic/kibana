/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EmbeddableConversationRightActions } from './embeddable_conversation_actions';
import { EmbeddableConversationTitle } from './embeddable_conversation_title';
import { EmbeddableMenuButton } from './embeddable_menu_button';
import { useAgentBuilderAgents } from '../../../hooks/agents/use_agents';
import { useAgentId, useHasActiveConversation } from '../../../hooks/use_conversation';
import { useConversationTemplateDisplay } from '../../../hooks/use_conversation_template_display';

const newConversationTitleLabel = i18n.translate(
  'xpack.agentBuilder.embeddableHeader.newConversation',
  {
    defaultMessage: 'New Conversation',
  }
);

interface EmbeddableConversationHeaderProps {
  onClose?: () => void;
  ariaLabelledBy?: string;
}

export const EmbeddableConversationHeader: React.FC<EmbeddableConversationHeaderProps> = ({
  onClose,
  ariaLabelledBy,
}) => {
  const { euiTheme } = useEuiTheme();
  const agentId = useAgentId();
  const { agents } = useAgentBuilderAgents();
  const hasActiveConversation = useHasActiveConversation();
  const currentAgent = agents.find((a) => a.id === agentId);
  const templateDisplay = useConversationTemplateDisplay();
  const templateName = templateDisplay?.name;
  const templateIcon = templateDisplay?.icon;

  return (
    <div
      css={css`
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: center;
        gap: ${euiTheme.size.s};
        width: 100%;
      `}
    >
      <EmbeddableMenuButton />

      {/* Center: title + agent subtitle — overflow hidden ensures nothing escapes the column */}
      <div
        css={css`
          overflow: hidden;
        `}
      >
        {hasActiveConversation ? (
          <EmbeddableConversationTitle ariaLabelledBy={ariaLabelledBy} />
        ) : (
          <h4
            id={ariaLabelledBy}
            css={css`
              font-weight: ${euiTheme.font.weight.semiBold};
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            `}
          >
            {newConversationTitleLabel}
          </h4>
        )}
        {currentAgent && (
          <EuiText
            size="xs"
            color="subdued"
            css={css`
              display: flex;
              align-items: center;
              gap: ${euiTheme.size.xs};
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            `}
          >
            {currentAgent.name}
            {templateName && (
              <>
                {'/'}
                {templateIcon && <EuiIcon type={templateIcon} size="s" aria-hidden={true} />}
                {templateName}
              </>
            )}
          </EuiText>
        )}
      </div>

      {/* Right: kebab menu + close */}
      <EmbeddableConversationRightActions onClose={onClose} />
    </div>
  );
};
