/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiTab, EuiTabs, EuiText, useEuiTheme, useGeneratedHtmlId } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState } from 'react';
import { useConversation, useHasPersistedConversation } from '../../../hooks/use_conversation';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { Conversation } from '../conversation';
import { ConversationDetailHeader } from './conversation_detail_header';
import { ConversationDetailSidebar } from './conversation_detail_sidebar';
import { isCollaborativeTemplateConversation } from './template_conversation_utils';
import { ConversationDetailAttachmentsTab } from './tabs/conversation_detail_attachments_tab';
import { getDisplayableConversationAttachments } from './tabs/conversation_attachment_display_utils';
import { ConversationDetailPlaceholderTab } from './tabs/conversation_detail_placeholder_tab';

enum ConversationDetailTab {
  activity = 'activity',
  attachments = 'attachments',
  threads = 'threads',
  details = 'details',
}

const labels = {
  activity: i18n.translate('xpack.agentBuilder.conversationDetail.tabs.activity', {
    defaultMessage: 'Activity',
  }),
  attachments: (count: number) =>
    i18n.translate('xpack.agentBuilder.conversationDetail.tabs.attachments', {
      defaultMessage: 'Attachments {count}',
      values: { count },
    }),
  threads: i18n.translate('xpack.agentBuilder.conversationDetail.tabs.threads', {
    defaultMessage: 'Threads',
  }),
  details: i18n.translate('xpack.agentBuilder.conversationDetail.tabs.details', {
    defaultMessage: 'Details',
  }),
  activityFooter: i18n.translate('xpack.agentBuilder.conversationDetail.activity.footer', {
    defaultMessage:
      'Activity is multi-user and audited. Use @agent in collaborative template conversations to invoke the agent.',
  }),
  threadsPlaceholder: i18n.translate(
    'xpack.agentBuilder.conversationDetail.tabs.threadsPlaceholder',
    {
      defaultMessage: 'Parallel threads will appear here in a follow-up release.',
    }
  ),
};

interface ConversationDetailShellProps {
  onClose?: () => void;
  ariaLabelledBy?: string;
}

export const ConversationDetailShell: React.FC<ConversationDetailShellProps> = ({
  onClose,
  ariaLabelledBy,
}) => {
  const { euiTheme } = useEuiTheme();
  const { isEmbeddedContext } = useConversationContext();
  const hasPersistedConversation = useHasPersistedConversation();
  const { conversation, isLoading } = useConversation();
  const [selectedTab, setSelectedTab] = useState<ConversationDetailTab>(
    ConversationDetailTab.activity
  );
  const tabsId = useGeneratedHtmlId({ prefix: 'conversationDetailTabs' });

  const attachmentCount = getDisplayableConversationAttachments(conversation?.attachments).length;
  const isCollaborative = isCollaborativeTemplateConversation(conversation);
  const showDetailsTab = isEmbeddedContext;

  const shellStyles = css`
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  `;

  const headerStyles = css`
    flex-shrink: 0;
    padding: ${euiTheme.size.m} ${euiTheme.size.l} ${euiTheme.size.s};
  `;

  const bodyStyles = css`
    flex: 1;
    min-height: 0;
    display: flex;
    overflow: hidden;
  `;

  const mainColumnStyles = css`
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `;

  const tabContentStyles = css`
    flex: 1;
    min-height: 0;
    overflow: hidden;
    padding: ${selectedTab === ConversationDetailTab.activity
      ? '0'
      : `${euiTheme.size.m} ${euiTheme.size.l}`};
  `;

  const sidebarStyles = css`
    flex-shrink: 0;
    width: 320px;
    min-height: 0;
    overflow: hidden;
  `;

  const tabs = useMemo(() => {
    const items = [
      { id: ConversationDetailTab.activity, label: labels.activity },
      {
        id: ConversationDetailTab.attachments,
        label: labels.attachments(attachmentCount),
      },
      { id: ConversationDetailTab.threads, label: labels.threads },
    ];

    if (showDetailsTab) {
      items.push({ id: ConversationDetailTab.details, label: labels.details });
    }

    return items;
  }, [attachmentCount, showDetailsTab]);

  if (!hasPersistedConversation) {
    return <Conversation layoutVariant="detail" />;
  }

  return (
    <div css={shellStyles} data-test-subj="agentBuilderConversationDetail">
      <div css={headerStyles}>
        <ConversationDetailHeader
          conversation={conversation}
          isLoading={isLoading}
          onClose={onClose}
          ariaLabelledBy={ariaLabelledBy}
        />
      </div>

      <EuiTabs bottomBorder size="s" id={tabsId}>
        {tabs.map((tab) => (
          <EuiTab
            key={tab.id}
            onClick={() => setSelectedTab(tab.id)}
            isSelected={selectedTab === tab.id}
            data-test-subj={`conversationDetailTab-${tab.id}`}
          >
            {tab.label}
          </EuiTab>
        ))}
      </EuiTabs>

      <div css={bodyStyles}>
        <div css={mainColumnStyles}>
          <div css={tabContentStyles}>
            {selectedTab === ConversationDetailTab.activity && (
              <div
                css={css`
                  display: flex;
                  flex-direction: column;
                  height: 100%;
                  min-height: 0;
                `}
              >
                <div
                  css={css`
                    flex: 1;
                    min-height: 0;
                  `}
                >
                  <Conversation layoutVariant="detail" />
                </div>
                {isCollaborative && (
                  <>
                    <EuiSpacer size="s" />
                    <EuiText
                      size="xs"
                      color="subdued"
                      css={css`
                        padding: 0 ${euiTheme.size.l};
                      `}
                    >
                      {labels.activityFooter}
                    </EuiText>
                    <EuiSpacer size="s" />
                  </>
                )}
              </div>
            )}

            {selectedTab === ConversationDetailTab.attachments && conversation && (
              <ConversationDetailAttachmentsTab
                attachments={conversation.attachments}
                conversation={conversation}
              />
            )}

            {selectedTab === ConversationDetailTab.threads && (
              <ConversationDetailPlaceholderTab
                iconType="branch"
                title={labels.threads}
                body={labels.threadsPlaceholder}
              />
            )}

            {selectedTab === ConversationDetailTab.details && conversation && (
              <ConversationDetailSidebar conversation={conversation} />
            )}
          </div>
        </div>

        {!showDetailsTab && conversation && (
          <div css={sidebarStyles}>
            <ConversationDetailSidebar conversation={conversation} />
          </div>
        )}
      </div>
    </div>
  );
};
