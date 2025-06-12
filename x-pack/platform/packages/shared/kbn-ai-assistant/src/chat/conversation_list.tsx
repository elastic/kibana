/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCollapsibleNavGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiListGroup,
  EuiListGroupItem,
  EuiLoadingSpinner,
  EuiPanel,
  euiScrollBarStyles,
  EuiSpacer,
  EuiText,
  UseEuiTheme,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import React, { MouseEvent, useEffect, useMemo, useState } from 'react';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import type { UseConversationListResult } from '../hooks/use_conversation_list';
import { useConfirmModal, useConversationsByDate, useConversationContextMenu } from '../hooks';
import { DATE_CATEGORY_LABELS } from '../i18n';
import { NewChatButton } from '../buttons/new_chat_button';
import { ConversationListItemLabel } from './conversation_list_item_label';
import { isConversationOwnedByUser } from '../utils/is_conversation_owned_by_current_user';

enum ListSections {
  CONVERSATIONS = 'conversations',
  ARCHIVED = 'archived',
}

const panelClassName = css`
  height: 100%;
  display: flex;
  flex-direction: column;
  padding-top: 56px;
`;

const scrollSectionClass = (scrollBarStyles: string) => css`
  overflow-y: auto;
  max-height: ${Math.floor(window.innerHeight * 0.7)}px;
  ${scrollBarStyles}
`;

const newChatButtonWrapperClassName = css`
  padding-bottom: 5px;
`;

const titleClassName = css`
  text-transform: uppercase;
  font-weight: bold;
`;

const containerClassName = (theme: UseEuiTheme) => css`
  height: 100%;
  border-top: solid 1px ${theme.euiTheme.border.color};
`;

export function ConversationList({
  conversations,
  isLoading,
  selectedConversationId,
  currentUser,
  onConversationSelect,
  newConversationHref,
  getConversationHref,
  setIsUpdatingConversationList,
  refreshConversations,
  updateDisplayedConversation,
}: {
  conversations: UseConversationListResult['conversations'];
  isLoading: boolean;
  selectedConversationId?: string;
  currentUser: Pick<AuthenticatedUser, 'full_name' | 'username' | 'profile_uid'>;
  onConversationSelect?: (conversationId?: string) => void;
  newConversationHref?: string;
  getConversationHref?: (conversationId: string) => string;
  setIsUpdatingConversationList: (isUpdating: boolean) => void;
  refreshConversations: () => void;
  updateDisplayedConversation: (id?: string) => void;
}) {
  const euiTheme = useEuiTheme();
  const scrollBarStyles = euiScrollBarStyles(euiTheme);

  const [allConversations, activeConversations, archivedConversations] = useMemo(() => {
    const conversationList = conversations.value?.conversations ?? [];

    return [
      conversationList,
      conversationList.filter((c) => !c.archived),
      conversationList.filter((c) => c.archived),
    ];
  }, [conversations.value?.conversations]);

  const selectedConversation = useMemo(
    () => allConversations.find((c) => c.conversation.id === selectedConversationId),
    [allConversations, selectedConversationId]
  );

  const categorizedActiveConversations = useConversationsByDate(
    activeConversations,
    getConversationHref
  );

  const categorizedArchivedConversations = useConversationsByDate(
    archivedConversations,
    getConversationHref
  );

  const [openSection, setOpenSection] = useState<ListSections>(ListSections.CONVERSATIONS);

  const { element: confirmDeleteElement, confirm: confirmDeleteCallback } = useConfirmModal({
    title: i18n.translate('xpack.aiAssistant.flyout.confirmDeleteConversationTitle', {
      defaultMessage: 'Delete conversation',
    }),
    children: i18n.translate('xpack.aiAssistant.flyout.confirmDeleteConversationContent', {
      defaultMessage: 'This action is permanent and cannot be undone.',
    }),
    confirmButtonText: i18n.translate('xpack.aiAssistant.flyout.confirmDeleteButtonText', {
      defaultMessage: 'Delete',
    }),
  });

  const onClickConversation = (
    e: MouseEvent<HTMLButtonElement> | MouseEvent<HTMLAnchorElement>,
    conversationId?: string
  ) => {
    if (onConversationSelect) {
      e.preventDefault();
      onConversationSelect(conversationId);
    }
  };

  const { deleteConversation } = useConversationContextMenu({
    setIsUpdatingConversationList,
    refreshConversations,
  });

  const renderCategorizedList = (
    categorizedConversations: ReturnType<typeof useConversationsByDate>
  ) => {
    return Object.entries(categorizedConversations).map(([category, list]) =>
      list.length ? (
        <EuiFlexItem grow={false} key={category}>
          <EuiPanel hasBorder={false} hasShadow={false} paddingSize="s">
            <EuiText className={titleClassName} size="s">
              {DATE_CATEGORY_LABELS[category]}
            </EuiText>
          </EuiPanel>
          <EuiListGroup flush={false} gutterSize="none">
            {list.map((conversation) => (
              <EuiListGroupItem
                data-test-subj="observabilityAiAssistantConversationsLink"
                key={conversation.id}
                label={
                  <ConversationListItemLabel
                    labelText={conversation.label}
                    isPublic={conversation.public}
                  />
                }
                size="s"
                isActive={conversation.id === selectedConversationId}
                isDisabled={isLoading}
                showToolTip
                toolTipText={conversation.label}
                href={conversation.href}
                onClick={(event) => onClickConversation(event, conversation.id)}
                extraAction={{
                  iconType: 'trash',
                  color: 'danger',
                  'aria-label': i18n.translate(
                    'xpack.aiAssistant.conversationList.deleteConversationIconLabel',
                    { defaultMessage: 'Delete' }
                  ),
                  disabled: !isConversationOwnedByUser({
                    conversationId: conversation.id,
                    conversationUser: conversation.conversation.user,
                    currentUser,
                  }),
                  onClick: () => {
                    confirmDeleteCallback().then((confirmed) => {
                      if (!confirmed) return;
                      deleteConversation(conversation.id).then(() => {
                        if (conversation.id === selectedConversationId) {
                          updateDisplayedConversation();
                        }
                      });
                    });
                  },
                }}
              />
            ))}
          </EuiListGroup>
          <EuiSpacer size="s" />
        </EuiFlexItem>
      ) : null
    );
  };

  useEffect(() => {
    if (selectedConversation?.archived) {
      setOpenSection(ListSections.ARCHIVED);
    } else {
      setOpenSection(ListSections.CONVERSATIONS);
    }
  }, [selectedConversation]);

  const loader = (
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="s">
      <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="s" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );

  return (
    <>
      <EuiPanel paddingSize="none" hasShadow={false} className={panelClassName}>
        <EuiFlexGroup direction="column" gutterSize="none" className={containerClassName(euiTheme)}>
          {isLoading && !allConversations.length ? (
            <EuiFlexItem grow={true}>
              <EuiPanel hasBorder={false} hasShadow={false} paddingSize="m">
                <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiLoadingSpinner size="s" />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
          ) : null}

          {conversations.error ? (
            <EuiFlexItem grow={false}>
              <EuiPanel hasBorder={false} hasShadow={false} paddingSize="m">
                <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="warning" color="danger" />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s" color="danger">
                      {i18n.translate('xpack.aiAssistant.conversationList.errorMessage', {
                        defaultMessage: 'Failed to load',
                      })}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
          ) : null}

          {!isLoading && !conversations.error && !allConversations?.length ? (
            <EuiPanel hasBorder={false} hasShadow={false} paddingSize="m">
              <EuiText color="subdued" size="s">
                {i18n.translate('xpack.aiAssistant.conversationList.noConversations', {
                  defaultMessage: 'No conversations',
                })}
              </EuiText>
            </EuiPanel>
          ) : null}

          {!conversations.error && allConversations?.length ? (
            <>
              <EuiFlexItem grow>
                <EuiFlexGroup direction="column" gutterSize="none">
                  <EuiFlexItem grow={openSection === ListSections.CONVERSATIONS}>
                    <EuiCollapsibleNavGroup
                      isCollapsible
                      title={i18n.translate(
                        'xpack.aiAssistant.conversationList.conversationsTitle',
                        {
                          defaultMessage: 'Conversations',
                        }
                      )}
                      titleSize="xs"
                      iconType="list"
                      iconSize="m"
                      onToggle={(isOpen) =>
                        setOpenSection(isOpen ? ListSections.CONVERSATIONS : ListSections.ARCHIVED)
                      }
                      forceState={openSection === ListSections.CONVERSATIONS ? 'open' : 'closed'}
                    >
                      <div className={scrollSectionClass(scrollBarStyles)}>
                        {isLoading ? loader : null}
                        <EuiFlexGroup direction="column" gutterSize="xs">
                          {renderCategorizedList(categorizedActiveConversations)}
                        </EuiFlexGroup>
                      </div>
                    </EuiCollapsibleNavGroup>
                  </EuiFlexItem>

                  <EuiFlexItem grow={openSection === ListSections.ARCHIVED}>
                    <EuiCollapsibleNavGroup
                      isCollapsible
                      title={i18n.translate('xpack.aiAssistant.conversationList.archivedTitle', {
                        defaultMessage: 'Archived',
                      })}
                      titleSize="xs"
                      iconType="folderOpen"
                      iconSize="m"
                      onToggle={(isOpen) =>
                        setOpenSection(isOpen ? ListSections.ARCHIVED : ListSections.CONVERSATIONS)
                      }
                      forceState={openSection === ListSections.ARCHIVED ? 'open' : 'closed'}
                      borders="horizontal"
                    >
                      <div className={scrollSectionClass(scrollBarStyles)}>
                        {isLoading ? loader : null}
                        <EuiFlexGroup direction="column" gutterSize="xs">
                          {renderCategorizedList(categorizedArchivedConversations)}
                        </EuiFlexGroup>
                      </div>
                    </EuiCollapsibleNavGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </>
          ) : null}

          <EuiFlexItem grow={false}>
            <EuiPanel paddingSize="s" hasBorder={false} hasShadow={false}>
              <EuiFlexGroup alignItems="center">
                <EuiFlexItem grow className={newChatButtonWrapperClassName}>
                  <NewChatButton
                    href={newConversationHref}
                    onClick={(event) => onClickConversation(event)}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      {confirmDeleteElement}
    </>
  );
}
