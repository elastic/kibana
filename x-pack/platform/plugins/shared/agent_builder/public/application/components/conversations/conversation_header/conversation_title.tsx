/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { CONVERSATION_TEMPLATES } from '../../../../../common/templates';
import { useConversation, useHasPersistedConversation } from '../../../hooks/use_conversation';
import { ConversationTitleMetadata } from './conversation_title_metadata';

const labels = {
  newConversation: i18n.translate('xpack.agentBuilder.conversationTitle.newConversation', {
    defaultMessage: 'New conversation',
  }),
};

interface ConversationTitleProps {
  ariaLabelledBy?: string;
}

export const ConversationTitle: React.FC<ConversationTitleProps> = ({ ariaLabelledBy }) => {
  const { conversation, isLoading: isLoadingTitle } = useConversation();
  const hasPersistedConversation = useHasPersistedConversation();
  const { euiTheme } = useEuiTheme();

  const templateName = conversation?.template_id
    ? CONVERSATION_TEMPLATES.find((template) => template.id === conversation.template_id)?.name ??
      conversation.template_id
    : undefined;

  // No popover for unsaved conversations — just show the title
  if (!hasPersistedConversation) {
    const displayedTitle = isLoadingTitle ? '' : conversation?.title || labels.newConversation;

    return (
      <EuiTitle size="xs">
        <h3
          id={ariaLabelledBy}
          css={css`
            font-weight: ${euiTheme.font.weight.semiBold};
          `}
          data-test-subj="agentBuilderConversationTitle"
        >
          {displayedTitle}
        </h3>
      </EuiTitle>
    );
  }

  const titleRowStyles = css`
    gap: ${euiTheme.size.s};
  `;

  return (
    <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false} css={titleRowStyles}>
      <EuiFlexItem grow={false}>
        <ConversationTitleMetadata ariaLabelledBy={ariaLabelledBy} />
      </EuiFlexItem>
      {templateName && (
        <EuiFlexItem grow={false}>
          <EuiBadge color="primary" data-test-subj="agentBuilderConversationTemplateBadge">
            {templateName}
          </EuiBadge>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
