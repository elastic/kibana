/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  EuiPopoverFooter,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedDate } from '@kbn/i18n-react';
import { AGENT_BUILDER_UI_EBT, ConversationAccessControlMode } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import { useConversation, useConversationPermissions } from '../../../hooks/use_conversation';
import { useConversationTemplateDisplay } from '../../../hooks/use_conversation_template_display';
import { DeleteConversationModal } from '../delete_conversation_modal';
import { RenameConversationModal } from '../rename_conversation_modal';

const POPOVER_WIDTH = 280;

const labels = {
  editTitle: i18n.translate('xpack.agentBuilder.conversationTitleMetadata.editTitle', {
    defaultMessage: 'Edit title',
  }),
  delete: i18n.translate('xpack.agentBuilder.conversationTitleMetadata.delete', {
    defaultMessage: 'Delete',
  }),
  newConversation: i18n.translate('xpack.agentBuilder.conversationTitleMetadata.newConversation', {
    defaultMessage: 'New conversation',
  }),
  openTitleMenu: i18n.translate('xpack.agentBuilder.conversationTitleMetadata.openTitleMenu', {
    defaultMessage: 'Open conversation menu',
  }),
  author: i18n.translate('xpack.agentBuilder.conversationTitleMetadata.author', {
    defaultMessage: 'Author',
  }),
  created: i18n.translate('xpack.agentBuilder.conversationTitleMetadata.created', {
    defaultMessage: 'Created',
  }),
  lastEdited: i18n.translate('xpack.agentBuilder.conversationTitleMetadata.lastEdited', {
    defaultMessage: 'Last edited',
  }),
  visibility: i18n.translate('xpack.agentBuilder.conversationTitleMetadata.visibility', {
    defaultMessage: 'Visibility',
  }),
  chatType: i18n.translate('xpack.agentBuilder.conversationTitleMetadata.chatType', {
    defaultMessage: 'Chat type',
  }),
  public: i18n.translate('xpack.agentBuilder.conversationTitleMetadata.public', {
    defaultMessage: 'Public',
  }),
  private: i18n.translate('xpack.agentBuilder.conversationTitleMetadata.private', {
    defaultMessage: 'Private',
  }),
  defaultChatType: i18n.translate('xpack.agentBuilder.conversationTitleMetadata.defaultChatType', {
    defaultMessage: 'Default',
  }),
};

interface InfoRowProps {
  label: string;
  value: React.ReactNode;
  icon?: IconType;
  iconPosition?: 'left' | 'right';
}

const InfoRow = ({ label, value, icon, iconPosition = 'right' }: InfoRowProps) => {
  const { euiTheme } = useEuiTheme();

  const iconItem = icon && (
    <EuiFlexItem grow={false}>
      <EuiIcon type={icon} size="s" aria-hidden={true} />
    </EuiFlexItem>
  );

  return (
    <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText
          size="xs"
          css={css`
            font-weight: ${euiTheme.font.weight.semiBold};
          `}
        >
          {label}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          {iconPosition === 'left' && iconItem}
          <EuiFlexItem grow={false}>
            <EuiText size="xs">{value}</EuiText>
          </EuiFlexItem>
          {iconPosition === 'right' && iconItem}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

interface ConversationTitleMetadataProps {
  ariaLabelledBy?: string;
}

export const ConversationTitleMetadata = ({ ariaLabelledBy }: ConversationTitleMetadataProps) => {
  const { conversation, isLoading: isLoadingTitle } = useConversation();
  const { rename: canRename, delete: canDelete } = useConversationPermissions();
  const { euiTheme } = useEuiTheme();

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const displayedTitle = isLoadingTitle ? '' : conversation?.title || labels.newConversation;
  const templateDisplay = useConversationTemplateDisplay();
  const templateName = templateDisplay?.name;
  const templateIcon = templateDisplay?.icon;
  const visibilityLabel =
    conversation?.access_control?.access_mode === ConversationAccessControlMode.Public
      ? labels.public
      : labels.private;

  const titleButtonStyles = css`
    max-width: 100%;
    block-size: auto;
    padding: 0;
  `;

  const popoverPanelStyles = css`
    width: ${POPOVER_WIDTH}px;
    padding: ${euiTheme.size.m};
  `;

  const popoverFooterStyles = css`
    padding: ${euiTheme.size.m};
  `;

  const titleButton = (
    <EuiButtonEmpty
      color="text"
      flush="left"
      onClick={() => setIsPopoverOpen((open) => !open)}
      aria-expanded={isPopoverOpen}
      css={titleButtonStyles}
      data-test-subj="agentBuilderConversationTitleButton"
      {...getEbtProps({
        element: AGENT_BUILDER_UI_EBT.element.pageContent,
        action: AGENT_BUILDER_UI_EBT.action.conversation.OPEN_TITLE_MENU,
        detail: 'conversation',
      })}
    >
      <EuiTitle size="xs">
        <h4 id={ariaLabelledBy}>{displayedTitle}</h4>
      </EuiTitle>
    </EuiButtonEmpty>
  );

  return (
    <>
      <EuiPopover
        button={titleButton}
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
        panelPaddingSize="none"
        anchorPosition="downLeft"
        aria-label={labels.openTitleMenu}
      >
        {conversation && (
          <div css={popoverPanelStyles}>
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem grow={false}>
                <InfoRow label={labels.author} value={conversation.user.username} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <InfoRow
                  label={labels.created}
                  value={
                    <FormattedDate
                      value={conversation.created_at}
                      year="numeric"
                      month="short"
                      day="numeric"
                      hour="numeric"
                      minute="2-digit"
                    />
                  }
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <InfoRow
                  label={labels.lastEdited}
                  value={
                    <FormattedDate
                      value={conversation.updated_at}
                      year="numeric"
                      month="short"
                      day="numeric"
                      hour="numeric"
                      minute="2-digit"
                    />
                  }
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <InfoRow label={labels.visibility} value={visibilityLabel} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <InfoRow
                  label={labels.chatType}
                  value={templateName || labels.defaultChatType}
                  icon={templateIcon || 'comment'}
                  iconPosition="left"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        )}

        {(canDelete || canRename) && (
          <EuiPopoverFooter paddingSize="none" css={popoverFooterStyles}>
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
              {canDelete && (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    color="danger"
                    iconType="trash"
                    size="xs"
                    flush="left"
                    onClick={() => {
                      setIsPopoverOpen(false);
                      setIsDeleteModalOpen(true);
                    }}
                    data-test-subj="agentBuilderConversationDeleteButton"
                    {...getEbtProps({
                      element: AGENT_BUILDER_UI_EBT.element.pageContent,
                      action: AGENT_BUILDER_UI_EBT.action.conversation.DELETE,
                      detail: 'conversation',
                    })}
                  >
                    {labels.delete}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              )}
              {canRename && (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    iconType="pencil"
                    size="xs"
                    flush="right"
                    onClick={() => {
                      setIsPopoverOpen(false);
                      setIsRenameModalOpen(true);
                    }}
                    data-test-subj="agentBuilderConversationRenameButton"
                    {...getEbtProps({
                      element: AGENT_BUILDER_UI_EBT.element.pageContent,
                      action: AGENT_BUILDER_UI_EBT.action.conversation.RENAME,
                      detail: 'conversation',
                    })}
                  >
                    {labels.editTitle}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiPopoverFooter>
        )}
      </EuiPopover>

      <RenameConversationModal
        isOpen={isRenameModalOpen}
        onClose={() => setIsRenameModalOpen(false)}
      />

      <DeleteConversationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </>
  );
};
