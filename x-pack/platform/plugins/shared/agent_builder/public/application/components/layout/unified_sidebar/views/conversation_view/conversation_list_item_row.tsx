/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom-v5-compat';

import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPopover,
  EuiTextTruncate,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { getEbtProps } from '@kbn/ebt-click';
import type { ConversationDisplayStatus } from '@kbn/agent-builder-common';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';

import { appPaths } from '../../../../../utils/app_paths';
import { useConversationListMutations } from '../../../../../hooks/use_conversation_list_mutations';
import { useToasts } from '../../../../../hooks/use_toasts';
import {
  createActiveConversationListItemStyles,
  createConversationListItemStyles,
  createStatusLinkStyles,
} from '../../../../conversations/conversation_list_item_styles';
import { BaseDeleteConversationModal } from '../../../../conversations/delete_conversation_modal';
import { BaseRenameConversationModal } from '../../../../conversations/rename_conversation_modal';
import { ConversationStatusIndicator } from './conversation_status_indicator';

const ACTIONS_CLASS = 'agentBuilderSidebarConversationListRowActions';
const STATUS_INDICATOR_CLASS = 'agentBuilderSidebarConversationListRowStatusIndicator';

const labels = {
  rename: i18n.translate('xpack.agentBuilder.sidebar.conversationList.rename', {
    defaultMessage: 'Rename',
  }),
  delete: i18n.translate('xpack.agentBuilder.sidebar.conversationList.delete', {
    defaultMessage: 'Delete',
  }),
  markAsRead: i18n.translate('xpack.agentBuilder.sidebar.conversationList.markAsRead', {
    defaultMessage: 'Mark as read',
  }),
  markAsUnread: i18n.translate('xpack.agentBuilder.sidebar.conversationList.markAsUnread', {
    defaultMessage: 'Mark as unread',
  }),
  pin: i18n.translate('xpack.agentBuilder.sidebar.conversationList.pin', {
    defaultMessage: 'Pin',
  }),
  unpin: i18n.translate('xpack.agentBuilder.sidebar.conversationList.unpin', {
    defaultMessage: 'Unpin',
  }),
  openMenu: i18n.translate('xpack.agentBuilder.sidebar.conversationList.openMenu', {
    defaultMessage: 'Open conversation menu',
  }),
  actionsMenu: i18n.translate('xpack.agentBuilder.sidebar.conversationList.actionsMenu', {
    defaultMessage: 'Conversation actions',
  }),
  deleteError: i18n.translate('xpack.agentBuilder.sidebar.conversationList.deleteError', {
    defaultMessage: 'Failed to delete conversation',
  }),
};

export interface ConversationListItemRowProps {
  agentId: string;
  conversationId: string;
  title: string;
  isActive: boolean;
  routeConversationId: string | undefined;
  showActionsMenu?: boolean;
  onItemClick?: () => void;
  status?: ConversationDisplayStatus;
  read?: boolean;
  isPinned?: boolean;
}

export const ConversationListItemRow: React.FC<ConversationListItemRowProps> = ({
  agentId,
  conversationId,
  title,
  isActive,
  routeConversationId,
  showActionsMenu = true,
  onItemClick,
  status,
  read,
  isPinned = false,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    deleteConversation,
    renameConversation,
    markAsRead,
    markAsUnread,
    markAsPinned,
    markAsUnpinned,
  } = useConversationListMutations({ routeConversationId, agentId });
  const { addErrorToast } = useToasts();

  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const togglePopover = useCallback(() => setIsPopoverOpen((open) => !open), []);

  const handleDelete = useCallback(
    async (convId: string) => {
      setIsDeleteModalOpen(false);
      setIsDeleting(true);
      try {
        await deleteConversation(convId);
      } catch (e) {
        addErrorToast({
          title: labels.deleteError,
          text: e instanceof Error ? e.message : undefined,
        });
        setIsDeleting(false);
      }
    },
    [deleteConversation, addErrorToast]
  );

  const baseLinkStyles = createConversationListItemStyles(euiTheme);
  const activeLinkStyles = createActiveConversationListItemStyles(euiTheme);
  const statusLinkStyles = createStatusLinkStyles(status, euiTheme);

  const linkStyles = css([
    isActive ? activeLinkStyles : baseLinkStyles,
    statusLinkStyles,
    css`
      flex: 1 1 0;
      min-width: 0;
      width: auto;
      display: block;
    `,
  ]);

  const iconSlotStyles = css`
    width: ${euiTheme.size.l};
    height: ${euiTheme.size.l};
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  const rowStyles = useMemo(() => {
    const bg = euiTheme.colors.backgroundLightPrimary;
    return css`
      display: flex;
      align-items: center;
      gap: ${euiTheme.size.xxs};
      border-radius: ${euiTheme.border.radius.small};
      padding-inline-end: ${status || showActionsMenu ? euiTheme.size.xxs : 0};

      &:hover,
      &:focus-within {
        background-color: ${bg};
      }

      ${(isActive || isPopoverOpen) &&
      css`
        background-color: ${bg};
      `}

      .${STATUS_INDICATOR_CLASS} {
        opacity: 1;
        transition: opacity 150ms ease;
      }

      .${ACTIONS_CLASS} {
        opacity: 0;
        transition: opacity 150ms ease;
      }

      ${showActionsMenu &&
      css`
        &:hover .${STATUS_INDICATOR_CLASS}, &:focus-within .${STATUS_INDICATOR_CLASS} {
          opacity: 0;
          pointer-events: none;
        }

        &:hover .${ACTIONS_CLASS}, &:focus-within .${ACTIONS_CLASS} {
          opacity: 1;
        }

        ${isPopoverOpen &&
        css`
          .${STATUS_INDICATOR_CLASS} {
            opacity: 0;
            pointer-events: none;
          }
          .${ACTIONS_CLASS} {
            opacity: 1;
          }
        `}
      `}
    `;
  }, [euiTheme, isActive, isPopoverOpen, showActionsMenu, status]);

  const isUnread = read === false;

  const menuItems = useMemo(
    () => [
      <EuiContextMenuItem
        key="rename"
        icon="pencil"
        data-test-subj={`agentBuilderSidebarConversationRename-${conversationId}`}
        onClick={() => {
          closePopover();
          setIsRenameModalOpen(true);
        }}
        {...getEbtProps({
          element: AGENT_BUILDER_UI_EBT.element.sidebar,
          action: AGENT_BUILDER_UI_EBT.action.conversationList.RENAME_CONVERSATION,
        })}
      >
        {labels.rename}
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        key="read-status"
        icon={isUnread ? 'eyeSlash' : 'eye'}
        onClick={() => {
          closePopover();
          if (isUnread) {
            markAsRead(conversationId);
          } else {
            markAsUnread(conversationId);
          }
        }}
        {...getEbtProps({
          element: AGENT_BUILDER_UI_EBT.element.sidebar,
          action: isUnread
            ? AGENT_BUILDER_UI_EBT.action.conversationList.MARK_AS_READ
            : AGENT_BUILDER_UI_EBT.action.conversationList.MARK_AS_UNREAD,
        })}
      >
        {isUnread ? labels.markAsRead : labels.markAsUnread}
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        key="pin"
        icon="pin"
        onClick={() => {
          closePopover();
          if (isPinned) {
            markAsUnpinned(conversationId);
          } else {
            markAsPinned(conversationId);
          }
        }}
        {...getEbtProps({
          element: AGENT_BUILDER_UI_EBT.element.sidebar,
          action: isPinned
            ? AGENT_BUILDER_UI_EBT.action.conversationList.UNPIN_CONVERSATION
            : AGENT_BUILDER_UI_EBT.action.conversationList.PIN_CONVERSATION,
        })}
      >
        {isPinned ? labels.unpin : labels.pin}
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        key="delete"
        icon={<EuiIcon type="trash" color="danger" aria-hidden={true} />}
        data-test-subj={`agentBuilderSidebarConversationDelete-${conversationId}`}
        css={css`
          color: ${euiTheme.colors.danger};
        `}
        onClick={() => {
          closePopover();
          setIsDeleteModalOpen(true);
        }}
        {...getEbtProps({
          element: AGENT_BUILDER_UI_EBT.element.sidebar,
          action: AGENT_BUILDER_UI_EBT.action.conversationList.DELETE_CONVERSATION,
        })}
      >
        {labels.delete}
      </EuiContextMenuItem>,
    ],
    [
      closePopover,
      conversationId,
      euiTheme.colors.danger,
      isPinned,
      isUnread,
      markAsPinned,
      markAsRead,
      markAsUnpinned,
      markAsUnread,
    ]
  );

  const menuButton = (
    <EuiToolTip content={labels.openMenu} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType="boxesVertical"
        display="empty"
        size="xs"
        aria-label={labels.openMenu}
        aria-expanded={isPopoverOpen}
        onClick={(e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          togglePopover();
        }}
        data-test-subj={`agentBuilderSidebarConversationMenu-${conversationId}`}
        {...getEbtProps({
          element: AGENT_BUILDER_UI_EBT.element.sidebar,
          action: AGENT_BUILDER_UI_EBT.action.conversationList.OPEN_CONVERSATION_MENU,
        })}
      />
    </EuiToolTip>
  );

  return (
    <>
      <EuiFlexGroup
        gutterSize="none"
        responsive={false}
        alignItems="center"
        css={rowStyles}
        style={isDeleting ? { opacity: 0.4, pointerEvents: 'none' } : undefined}
        data-test-subj={`agentBuilderSidebarConversationRow-${conversationId}`}
      >
        <EuiFlexItem
          grow
          css={css`
            min-width: 0;
          `}
        >
          <Link
            to={appPaths.agent.conversations.byId({ agentId, conversationId })}
            css={linkStyles}
            data-test-subj={`agentBuilderSidebarConversation-${conversationId}`}
            onClick={() => {
              onItemClick?.();
            }}
            {...getEbtProps({
              element: AGENT_BUILDER_UI_EBT.element.sidebar,
              action: AGENT_BUILDER_UI_EBT.action.conversationList.CONVERSATION_RESUME,
            })}
          >
            <EuiTextTruncate text={title || conversationId} />
          </Link>
        </EuiFlexItem>

        {isDeleting ? (
          <EuiFlexItem grow={false}>
            <div css={iconSlotStyles}>
              <EuiLoadingSpinner size="s" />
            </div>
          </EuiFlexItem>
        ) : status !== undefined || showActionsMenu ? (
          <EuiFlexItem grow={false}>
            <div
              css={[
                iconSlotStyles,
                css`
                  position: relative;
                `,
              ]}
            >
              {status !== undefined && (
                <div
                  className={STATUS_INDICATOR_CLASS}
                  css={css`
                    position: absolute;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                  `}
                >
                  <ConversationStatusIndicator status={status} />
                </div>
              )}
              {showActionsMenu && (
                <div
                  className={ACTIONS_CLASS}
                  css={css`
                    position: absolute;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                  `}
                >
                  <EuiPopover
                    button={menuButton}
                    isOpen={isPopoverOpen}
                    closePopover={closePopover}
                    panelPaddingSize="none"
                    anchorPosition="downRight"
                    repositionOnScroll
                    aria-label={labels.actionsMenu}
                  >
                    <EuiContextMenuPanel items={menuItems} />
                  </EuiPopover>
                </div>
              )}
            </div>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>

      {isRenameModalOpen ? (
        <BaseRenameConversationModal
          onClose={() => setIsRenameModalOpen(false)}
          conversationId={conversationId}
          initialTitle={title}
          onRename={renameConversation}
        />
      ) : null}

      {isDeleteModalOpen ? (
        <BaseDeleteConversationModal
          onClose={() => setIsDeleteModalOpen(false)}
          conversationId={conversationId}
          title={title}
          onDelete={handleDelete}
        />
      ) : null}
    </>
  );
};
