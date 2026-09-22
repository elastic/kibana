/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useConversation, useHasPersistedConversation } from '../../../hooks/use_conversation';
import { useConversationTemplateDisplay } from '../../../hooks/use_conversation_template_display';
import { ConversationTitleMetadata } from './conversation_title_metadata';

const labels = {
  newConversation: i18n.translate('xpack.agentBuilder.conversationTitle.newConversation', {
    defaultMessage: 'New conversation',
  }),
};

interface ConversationTitleProps {
  ariaLabelledBy?: string;
}

export const ConversationTitle = ({ ariaLabelledBy }: ConversationTitleProps) => {
  const { conversation, isLoading: isLoadingTitle } = useConversation();
  const hasPersistedConversation = useHasPersistedConversation();
  const { euiTheme } = useEuiTheme();

  const templateDisplay = useConversationTemplateDisplay();
  const templateName = templateDisplay?.name;
  const templateIcon = templateDisplay?.icon;

  if (!hasPersistedConversation) {
    const displayedTitle = isLoadingTitle ? '' : conversation?.title || labels.newConversation;

    return (
      <EuiText size="xs">
        <h4
          id={ariaLabelledBy}
          css={css`
            font-weight: ${euiTheme.font.weight.semiBold};
          `}
          data-test-subj="agentBuilderConversationTitle"
        >
          {displayedTitle}
        </h4>
      </EuiText>
    );
  }

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <ConversationTitleMetadata ariaLabelledBy={ariaLabelledBy} />
      </EuiFlexItem>
      {templateName && (
        <EuiFlexItem grow={false}>
          <EuiBadge
            color="hollow"
            iconType={templateIcon}
            data-test-subj="agentBuilderConversationTemplateBadge"
          >
            {templateName}
          </EuiBadge>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
