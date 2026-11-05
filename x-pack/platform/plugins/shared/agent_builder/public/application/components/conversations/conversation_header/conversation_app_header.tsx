/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  AppHeader,
  type AppHeaderBadge,
  type AppHeaderMenu,
  type AppHeaderTitle,
} from '@kbn/app-header';
import {
  AGENT_BUILDER_UI_EBT,
  isPrivatelySharedConversation,
  isPublicConversation,
  normalizeConversationAccessControl,
} from '@kbn/agent-builder-common';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import {
  useConversation,
  useConversationPermissions,
  useConversationReadOnly,
  useHasPersistedConversation,
} from '../../../hooks/use_conversation';
import { useConversationTemplateDisplay } from '../../../hooks/use_conversation_template_display';
import { useDownloadConversation } from '../../../hooks/use_download_conversation';
import { useQueryState } from '../../../hooks/use_query_state';
import { searchParamNames } from '../../../search_param_names';
import { ConversationDetailsFlyout } from '../../../../flyout/conversation_details_flyout';
import { ActivityLogFlyout } from '../activity_log/activity_log_flyout';
import { useActivityLog } from '../activity_log/use_activity_log';
import { DeleteConversationModal } from '../delete_conversation_modal';
import { ConversationShareFlyout } from './conversation_share_button';
import { ConversationMetadataFlyout } from './conversation_metadata_flyout';
import { getConversationVisibilityLabel } from './conversation_visibility';
import { labels } from './conversation_app_header_i18n';
import { useHeaderPanel } from './use_header_panel';

const ebt = (action: string) => ({ action, detail: 'conversation' });

export const ConversationAppHeader: React.FC = () => {
  const { conversation, isLoading } = useConversation();
  const hasPersistedConversation = useHasPersistedConversation();
  const { isReadOnly } = useConversationReadOnly();
  const {
    rename: canRename,
    delete: canDelete,
    update_access_control: canUpdateAccessControl,
  } = useConversationPermissions();
  const { conversationActions } = useConversationContext();
  const templateDisplay = useConversationTemplateDisplay();
  const downloadConversation = useDownloadConversation();
  const { hasActivity } = useActivityLog();
  const [summaryParam, setSummaryParam] = useQueryState<string>(
    searchParamNames.openConversationDetails
  );

  // Open state for each flyout or modal the header opens. Each has its own, so EUI can stack the
  // flyouts. Menu items vanish once the menu closes, so closing returns focus to the menu.
  const share = useHeaderPanel();
  const chatDetails = useHeaderPanel();
  const activityLog = useHeaderPanel();
  const deleteModal = useHeaderPanel();

  const savedConversation = hasPersistedConversation ? conversation : undefined;

  if (!savedConversation) {
    return (
      <AppHeader spacing="compact" title={isLoading ? '' : conversation?.title || labels.newChat} />
    );
  }

  const accessControl = normalizeConversationAccessControl(savedConversation.access_control);
  const canShare = canUpdateAccessControl || isPrivatelySharedConversation(accessControl);
  const hasTemplate = Boolean(savedConversation.template_id);
  const isSummaryOpen = hasTemplate && summaryParam === 'true';

  const title: AppHeaderTitle = canRename
    ? {
        text: savedConversation.title,
        ariaLabel: labels.editTitle,
        placeholder: labels.newChat,
        onSave: async (nextTitle) => {
          try {
            await conversationActions.renameConversation(savedConversation.id, nextTitle);
          } catch {
            return labels.renameError;
          }
        },
      }
    : savedConversation.title;

  const badges: AppHeaderBadge[] = [
    {
      label: getConversationVisibilityLabel(savedConversation.access_control),
      color: isPublicConversation(savedConversation.access_control) ? 'hollow' : 'default',
      'data-test-subj': 'agentBuilderConversationVisibilityBadge',
    },
    ...(templateDisplay
      ? [
          {
            label: templateDisplay.name,
            color: 'hollow' as const,
            'data-test-subj': 'agentBuilderConversationTemplateBadge',
          },
        ]
      : []),
    ...(isReadOnly
      ? [{ label: labels.readOnly, 'data-test-subj': 'agentBuilderConversationReadOnlyBadge' }]
      : []),
  ];

  const menu: AppHeaderMenu = {
    items: [
      ...(canShare
        ? [
            {
              id: 'share',
              label: labels.share,
              iconType: 'share',
              testId: 'agentBuilderConversationShareButton',
              ebt: ebt(AGENT_BUILDER_UI_EBT.action.conversation.OPEN_SHARE),
              run: share.open,
            },
          ]
        : []),
      {
        id: 'chatDetails',
        label: labels.chatDetails,
        iconType: 'info',
        overflow: true,
        testId: 'agentBuilderConversationChatDetailsButton',
        ebt: ebt(AGENT_BUILDER_UI_EBT.action.conversation.OPEN_TITLE_MENU),
        run: chatDetails.open,
      },
      {
        id: 'activityLog',
        label: labels.activityLog,
        iconType: 'timeline',
        overflow: true,
        disableButton: !hasActivity,
        tooltipContent: hasActivity ? undefined : labels.activityLogNoActivity,
        testId: 'agentBuilderActivityLogMenuItem',
        ebt: ebt(AGENT_BUILDER_UI_EBT.action.conversation.OPEN_ACTIVITY_LOG),
        run: activityLog.open,
      },
      {
        id: 'downloadChat',
        label: labels.downloadChat,
        iconType: 'download',
        overflow: true,
        separator: 'above',
        testId: 'agentBuilderConversationDownloadButton',
        ebt: ebt(AGENT_BUILDER_UI_EBT.action.conversation.DOWNLOAD_CONVERSATION),
        run: downloadConversation,
      },
      ...(canDelete
        ? [
            {
              id: 'delete',
              label: labels.delete,
              iconType: 'trash',
              overflow: true as const,
              isDestructive: true,
              separator: 'above' as const,
              testId: 'agentBuilderConversationDeleteButton',
              ebt: ebt(AGENT_BUILDER_UI_EBT.action.conversation.DELETE),
              run: deleteModal.open,
            },
          ]
        : []),
    ],
    // The summary flyout shows what this button opens, so the button steps aside while it is open.
    ...(hasTemplate && !isSummaryOpen
      ? {
          primaryActionItem: {
            id: 'summary',
            label: labels.summary,
            iconType: 'transitionLeftOut',
            testId: 'agentBuilderChatInfoButton',
            run: () => setSummaryParam('true'),
          },
        }
      : {}),
  };

  return (
    <>
      <AppHeader spacing="compact" title={title} badges={badges} menu={menu} />
      {share.isOpen && (
        <ConversationShareFlyout
          key={savedConversation.id}
          conversation={savedConversation}
          onClose={share.close}
        />
      )}
      {chatDetails.isOpen && (
        <ConversationMetadataFlyout
          key={savedConversation.id}
          conversation={savedConversation}
          onClose={chatDetails.close}
        />
      )}
      {activityLog.isOpen && <ActivityLogFlyout onClose={activityLog.close} />}
      {isSummaryOpen && <ConversationDetailsFlyout onClose={() => setSummaryParam(null)} />}
      <DeleteConversationModal isOpen={deleteModal.isOpen} onClose={deleteModal.close} />
    </>
  );
};
