/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
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
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import React, { MouseEvent } from 'react';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import type { UseConversationListResult } from '../hooks/use_conversation_list';
import { useConfirmModal, useConversationsByDate, useConversationContextMenu } from '../hooks';
import { DATE_CATEGORY_LABELS } from '../i18n';
import { NewChatButton } from '../buttons/new_chat_button';
import { ConversationListItemLabel } from './conversation_list_item_label';
import { isConversationOwnedByUser } from '../utils/is_conversation_owned_by_current_user';

const panelClassName = css`
  max-height: 100%;
  padding-top: 56px;
`;

const overflowScrollClassName = (scrollBarStyles: string) => css`
  overflow-y: auto;
  ${scrollBarStyles}
`;

const newChatButtonWrapperClassName = css`
  padding-bottom: 5px;
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

  const containerClassName = css`
    height: 100%;
    border-top: solid 1px ${euiTheme.euiTheme.border.color};
    padding: ${euiTheme.euiTheme.size.s};
  `;

  const titleClassName = css`
    text-transform: uppercase;
    font-weight: ${euiTheme.euiTheme.font.weight.bold};
  `;

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

  // Categorize conversations by date
  const conversationsCategorizedByDate = useConversationsByDate(
    conversations.value?.conversations,
    getConversationHref
  );

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

  return (
    <>
      <EuiPanel paddingSize="none" hasShadow={false} className={panelClassName}>
        <EuiFlexGroup direction="column" gutterSize="none" className={containerClassName}>
          <EuiFlexItem grow className={overflowScrollClassName(scrollBarStyles)}>
            <EuiFlexGroup direction="column" gutterSize="xs">
              {isLoading ? (
                <EuiFlexItem grow={false}>
                  <EuiPanel hasBorder={false} hasShadow={false} paddingSize="s">
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
                  <EuiPanel hasBorder={false} hasShadow={false} paddingSize="s">
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

              {/* Render conversations categorized by date */}
              {Object.entries(conversationsCategorizedByDate).map(([category, conversationList]) =>
                conversationList.length ? (
                  <EuiFlexItem grow={false} key={category}>
                    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="s">
                      <EuiText className={titleClassName} size="s">
                        {DATE_CATEGORY_LABELS[category]}
                      </EuiText>
                    </EuiPanel>
                    <EuiListGroup flush={false} gutterSize="none">
                      {conversationList.map((conversation) => (
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
                              {
                                defaultMessage: 'Delete',
                              }
                            ),
                            disabled: !isConversationOwnedByUser({
                              conversationId: conversation.id,
                              conversationUser: conversation.conversation.user,
                              currentUser,
                            }),
                            onClick: () => {
                              confirmDeleteCallback(
                                i18n.translate(
                                  'xpack.aiAssistant.flyout.confirmDeleteCheckboxLabel',
                                  {
                                    defaultMessage: 'Delete "{title}"',
                                    values: { title: conversation.label },
                                  }
                                )
                              ).then((confirmed) => {
                                if (!confirmed) {
                                  return;
                                }

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
              )}

              {!isLoading && !conversations.error && !conversations.value?.conversations?.length ? (
                <EuiPanel hasBorder={false} hasShadow={false} paddingSize="s">
                  <EuiText color="subdued" size="s">
                    {i18n.translate('xpack.aiAssistant.conversationList.noConversations', {
                      defaultMessage: 'No conversations',
                    })}
                  </EuiText>
                </EuiPanel>
              ) : null}
            </EuiFlexGroup>
          </EuiFlexItem>

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
