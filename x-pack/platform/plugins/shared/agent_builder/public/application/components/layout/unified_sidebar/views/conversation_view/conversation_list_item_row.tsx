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
  EuiPopover,
  EuiTextTruncate,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { getEbtProps } from '@kbn/ebt-click';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';

import { appPaths } from '../../../../../utils/app_paths';
import { useConversationListMutations } from '../../../../../hooks/use_conversation_list_mutations';
import {
  createActiveConversationListItemStyles,
  createConversationListItemStyles,
} from '../../../../conversations/conversation_list_item_styles';
import { BaseDeleteConversationModal } from '../../../../conversations/delete_conversation_modal';
import { BaseRenameConversationModal } from '../../../../conversations/rename_conversation_modal';

const ACTIONS_CLASS = 'agentBuilderSidebarConversationListRowActions';

const labels = {
  rename: i18n.translate('xpack.agentBuilder.sidebar.conversationList.rename', {
    defaultMessage: 'Rename',
  }),
  delete: i18n.translate('xpack.agentBuilder.sidebar.conversationList.delete', {
    defaultMessage: 'Delete',
  }),
  openMenu: i18n.translate('xpack.agentBuilder.sidebar.conversationList.openMenu', {
    defaultMessage: 'Open conversation menu',
  }),
  actionsMenu: i18n.translate('xpack.agentBuilder.sidebar.conversationList.actionsMenu', {
    defaultMessage: 'Conversation actions',
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
}

export const ConversationListItemRow: React.FC<ConversationListItemRowProps> = ({
  agentId,
  conversationId,
  title,
  isActive,
  routeConversationId,
  showActionsMenu = true,
  onItemClick,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const { deleteConversation, renameConversation } = useConversationListMutations({
    routeConversationId,
  });

  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const togglePopover = useCallback(() => setIsPopoverOpen((open) => !open), []);

  const baseLinkStyles = createConversationListItemStyles(euiTheme);
  const activeLinkStyles = createActiveConversationListItemStyles(euiTheme);

  const linkStyles = css([
    isActive ? activeLinkStyles : baseLinkStyles,
    css`
      flex: 1 1 0;
      min-width: 0;
      width: auto;
      display: block;
    `,
  ]);

  const rowStyles = useMemo(() => {
    const bg = euiTheme.colors.backgroundLightPrimary;
    return css`
      display: flex;
      align-items: center;
      gap: ${euiTheme.size.xxs};
      border-radius: ${euiTheme.border.radius.small};
      padding-inline-end: ${showActionsMenu ? euiTheme.size.xxs : 0};

      &:hover,
      &:focus-within {
        background-color: ${bg};
      }

      ${(isActive || isPopoverOpen) &&
      css`
        background-color: ${bg};
      `}

      ${showActionsMenu &&
      css`
        .${ACTIONS_CLASS} {
          flex-shrink: 0;
          opacity: 0;
        }

        &:hover .${ACTIONS_CLASS}, &:focus-within .${ACTIONS_CLASS} {
          opacity: 1;
        }

        ${isPopoverOpen &&
        css`
          .${ACTIONS_CLASS} {
            opacity: 1;
          }
        `}
      `}
    `;
  }, [euiTheme, isActive, isPopoverOpen, showActionsMenu]);

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
    [closePopover, conversationId, euiTheme.colors.danger]
  );

  const menuButton = (
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
  );

  return (
    <>
      <EuiFlexGroup
        gutterSize="none"
        responsive={false}
        alignItems="center"
        css={rowStyles}
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

        {showActionsMenu ? (
          <EuiFlexItem grow={false}>
            <div className={ACTIONS_CLASS}>
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
          onDelete={deleteConversation}
        />
      ) : null}
    </>
  );
};
