/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiText,
  EuiTextTruncate,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { getEbtProps } from '@kbn/ebt-click';
import { AGENT_BUILDER_UI_EBT, ConversationAccessControlMode } from '@kbn/agent-builder-common';
import type { ListConversationsResponseItem } from '../../../../common/http_api/conversations';
import { useAgentBuilderServices } from '../../hooks/use_agent_builder_service';
import { formatConversationDate } from '../../utils/format_conversation_date';
import {
  createActiveConversationListItemStyles,
  createConversationListItemStyles,
} from './conversation_list_item_styles';

const labels = {
  defaultType: i18n.translate('xpack.agentBuilder.conversationSearchModal.defaultType', {
    defaultMessage: 'Chat',
  }),
  public: i18n.translate('xpack.agentBuilder.conversationSearchModal.public', {
    defaultMessage: 'Public',
  }),
  private: i18n.translate('xpack.agentBuilder.conversationSearchModal.private', {
    defaultMessage: 'Private',
  }),
};

const lockIconProps = { tabIndex: -1 };

const titleStyles = css`
  min-width: 0;
`;

interface ConversationSearchResultProps {
  conversation: ListConversationsResponseItem;
  isActive: boolean;
  onSelect: (conversationId: string) => void;
}

/** One chat in the search modal: sharing status, title, type and last updated date. */
export const ConversationSearchResult: React.FC<ConversationSearchResultProps> = ({
  conversation,
  isActive,
  onSelect,
}) => {
  const { euiTheme } = useEuiTheme();
  const { conversationTemplatesService } = useAgentBuilderServices();

  const { id, title, template_id: templateId, updated_at: updatedAt } = conversation;
  const isPublic =
    conversation.access_control?.access_mode === ConversationAccessControlMode.Public;
  const accessLabel = isPublic ? labels.public : labels.private;
  const typeLabel = templateId
    ? conversationTemplatesService.getTemplateUIDefinition(templateId)?.name ?? labels.defaultType
    : labels.defaultType;

  return (
    <button
      css={
        isActive
          ? createActiveConversationListItemStyles(euiTheme)
          : createConversationListItemStyles(euiTheme)
      }
      onClick={() => onSelect(id)}
      data-test-subj={`agentBuilderConversationSearchResult-${id}`}
      {...getEbtProps({
        element: AGENT_BUILDER_UI_EBT.element.sidebar,
        action: AGENT_BUILDER_UI_EBT.action.conversationList.CONVERSATION_RESUME,
      })}
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIconTip
            type={isPublic ? 'lockOpen' : 'lock'}
            color={isPublic ? euiTheme.colors.textParagraph : euiTheme.colors.textDisabled}
            content={accessLabel}
            aria-label={accessLabel}
            iconProps={lockIconProps}
            disableScreenReaderOutput
          />
        </EuiFlexItem>
        <EuiFlexItem css={titleStyles}>
          <EuiTextTruncate text={title || id} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText
            size="xs"
            color="subdued"
            data-test-subj={`agentBuilderConversationSearchResultType-${id}`}
          >
            {typeLabel}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText
            size="xs"
            color="subdued"
            data-test-subj={`agentBuilderConversationSearchResultDate-${id}`}
          >
            {formatConversationDate(updatedAt)}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </button>
  );
};
