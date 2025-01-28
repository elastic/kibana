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
import type { UseConversationListResult } from '../hooks/use_conversation_list';
import { useConfirmModal, useConversationsByDate } from '../hooks';
import { DATE_CATEGORY_LABELS } from '../i18n';
import { NewChatButton } from '../buttons/new_chat_button';

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
  onConversationSelect,
  onConversationDeleteClick,
  newConversationHref,
  getConversationHref,
}: {
  conversations: UseConversationListResult['conversations'];
  isLoading: boolean;
  selectedConversationId?: string;
  onConversationSelect?: (conversationId?: string) => void;
  onConversationDeleteClick: (conversationId: string) => void;
  newConversationHref?: string;
  getConversationHref?: (conversationId: string) => string;
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
      defaultMessage: 'Delete this conversation?',
    }),
    children: i18n.translate('xpack.aiAssistant.flyout.confirmDeleteConversationContent', {
      defaultMessage: 'This action cannot be undone.',
    }),
    confirmButtonText: i18n.translate('xpack.aiAssistant.flyout.confirmDeleteButtonText', {
      defaultMessage: 'Delete conversation',
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
                        {i18n.translate('xpack.aiAssistant.conversationList.dateGroup', {
                          defaultMessage: DATE_CATEGORY_LABELS[category],
                        })}
                      </EuiText>
                    </EuiPanel>
                    <EuiListGroup flush={false} gutterSize="none">
                      {conversationList.map((conversation) => (
                        <EuiListGroupItem
                          data-test-subj="observabilityAiAssistantConversationsLink"
                          key={conversation.id}
                          label={conversation.label}
                          size="s"
                          isActive={conversation.id === selectedConversationId}
                          isDisabled={isLoading}
                          wrapText
                          showToolTip
                          href={conversation.href}
                          onClick={(event) => onClickConversation(event, conversation.id)}
                          extraAction={{
                            iconType: 'trash',
                            'aria-label': i18n.translate(
                              'xpack.aiAssistant.conversationList.deleteConversationIconLabel',
                              {
                                defaultMessage: 'Delete',
                              }
                            ),
                            onClick: () => {
                              confirmDeleteCallback().then((confirmed) => {
                                if (!confirmed) {
                                  return;
                                }
                                onConversationDeleteClick(conversation.id);
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
