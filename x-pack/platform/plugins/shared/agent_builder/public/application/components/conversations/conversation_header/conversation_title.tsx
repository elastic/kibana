/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  useConversation,
  useConversationReadOnly,
  useHasPersistedConversation,
} from '../../../hooks/use_conversation';
import { useConversationTemplateDisplay } from '../../../hooks/use_conversation_template_display';
import { ConversationTitleMetadata } from './conversation_title_metadata';

const labels = {
  newConversation: i18n.translate('xpack.agentBuilder.conversationTitle.newConversation', {
    defaultMessage: 'New conversation',
  }),
  readOnly: i18n.translate('xpack.agentBuilder.conversationTitle.readOnly', {
    defaultMessage: 'Read-Only',
  }),
};

interface ConversationTitleProps {
  ariaLabelledBy?: string;
}

export const ConversationTitle = ({ ariaLabelledBy }: ConversationTitleProps) => {
  const { conversation, isLoading: isLoadingTitle } = useConversation();
  const isReadOnly = useConversationReadOnly();
  const hasPersistedConversation = useHasPersistedConversation();
  const { euiTheme } = useEuiTheme();

  const templateDisplay = useConversationTemplateDisplay();
  const templateName = templateDisplay?.name;
  const templateIcon = templateDisplay?.icon;
  const displayedTitle = isLoadingTitle ? '' : conversation?.title || labels.newConversation;

  const titleWrapperStyles = css`
    min-width: 0;
    display: inline-flex;
    align-items: center;
    gap: ${euiTheme.size.xs};
  `;

  const titleActionsWrapperStyles = css`
    min-width: 0;
  `;

  const titleTextStyles = css`
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `;

  const readOnlyBadge = isReadOnly ? (
    <EuiBadge
      color={euiTheme.colors.lightShade}
      iconType="lock"
      data-test-subj="agentBuilderConversationReadOnlyBadge"
      css={css`
        border-radius: 999px;
        color: ${euiTheme.colors.text};
      `}
    >
      {labels.readOnly}
    </EuiBadge>
  ) : null;

  if (!hasPersistedConversation) {
    return (
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} css={titleWrapperStyles}>
        <EuiFlexItem grow={false} css={titleTextStyles}>
          <h4
            id={ariaLabelledBy}
            css={css`
              font-weight: ${euiTheme.font.weight.semiBold};
            `}
            data-test-subj="agentBuilderConversationTitle"
          >
            {displayedTitle}
          </h4>
        </EuiFlexItem>
        {readOnlyBadge && <EuiFlexItem grow={false}>{readOnlyBadge}</EuiFlexItem>}
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="s"
      responsive={false}
      css={titleActionsWrapperStyles}
    >
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
      {readOnlyBadge && <EuiFlexItem grow={false}>{readOnlyBadge}</EuiFlexItem>}
    </EuiFlexGroup>
  );
};
