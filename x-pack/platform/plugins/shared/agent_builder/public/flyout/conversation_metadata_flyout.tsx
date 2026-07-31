/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiTabs,
  EuiTab,
  EuiText,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useQuery } from '@kbn/react-query';
import type { Conversation } from '@kbn/agent-builder-common';
import { CONVERSATION_TEMPLATES } from '../../common/templates';
import type { ConversationsService } from '../services/conversations/conversations_service';
import { getConversationFlyoutTabs } from './conversation_metadata_tabs_registry';

interface ConversationMetadataFlyoutProps {
  conversationId: string;
  titleId: string;
  conversationsService: ConversationsService;
}

interface ResolvedTab {
  id: string;
  position: number;
  content: (props: { conversation: Conversation }) => React.ReactNode;
}

const TimelineComingSoon: React.FC = () => (
  <EuiText size="s" color="subdued">
    <p>
      {i18n.translate('xpack.agentBuilder.conversationMetadataFlyout.timelineComingSoon', {
        defaultMessage: 'Timeline coming soon. Owned by AB',
      })}
    </p>
  </EuiText>
);

const tabLabel = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);

// Timeline is reserved: only its `position` can be overridden by the registry, its
// `content` is always this fixed placeholder — never populated by outside content.
const buildTabs = (conversation: Conversation): ResolvedTab[] => {
  const tabs = new Map<string, ResolvedTab>([
    ['timeline', { id: 'timeline', position: 0, content: () => <TimelineComingSoon /> }],
  ]);

  for (const entry of getConversationFlyoutTabs(conversation.template_id ?? '')) {
    if (entry.tab === 'timeline') {
      const timeline = tabs.get('timeline');
      if (timeline) {
        tabs.set('timeline', { ...timeline, position: entry.position });
      }
      continue;
    }
    tabs.set(entry.tab, { id: entry.tab, position: entry.position, content: entry.content });
  }

  return Array.from(tabs.values()).sort((a, b) => a.position - b.position);
};

export const ConversationMetadataFlyout: React.FC<ConversationMetadataFlyoutProps> = ({
  conversationId,
  titleId,
  conversationsService,
}) => {
  const [selectedTabId, setSelectedTabId] = useState<string | undefined>(undefined);

  const {
    data: conversation,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['conversation-metadata-flyout', conversationId],
    queryFn: () => conversationsService.get({ conversationId }),
  });

  const tabs = useMemo(() => (conversation ? buildTabs(conversation) : []), [conversation]);
  const effectiveSelectedTabId = selectedTabId ?? tabs[0]?.id;
  const selectedTab = tabs.find((tab) => tab.id === effectiveSelectedTabId);

  const title = useMemo(() => {
    if (isLoading) {
      return i18n.translate('xpack.agentBuilder.conversationMetadataFlyout.loadingTitle', {
        defaultMessage: 'Loading…',
      });
    }
    if (isError) {
      return i18n.translate('xpack.agentBuilder.conversationMetadataFlyout.errorTitle', {
        defaultMessage: 'Unable to load conversation',
      });
    }
    const templateId = conversation?.template_id;
    const templateName = CONVERSATION_TEMPLATES.find((t) => t.id === templateId)?.name;
    return (
      templateName ??
      templateId ??
      i18n.translate('xpack.agentBuilder.conversationMetadataFlyout.title', {
        defaultMessage: 'Conversation metadata',
      })
    );
  }, [isLoading, isError, conversation?.template_id]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>{title}</h2>
        </EuiTitle>
        {conversation && (
          <EuiTabs>
            {tabs.map((tab) => (
              <EuiTab
                key={tab.id}
                isSelected={tab.id === effectiveSelectedTabId}
                onClick={() => setSelectedTabId(tab.id)}
              >
                {tabLabel(tab.id)}
              </EuiTab>
            ))}
          </EuiTabs>
        )}
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {isLoading && <EuiLoadingSpinner size="l" />}
        {isError && (
          <EuiText size="s" color="danger">
            <p>
              {i18n.translate('xpack.agentBuilder.conversationMetadataFlyout.errorBody', {
                defaultMessage: 'Something went wrong while loading this conversation.',
              })}
            </p>
          </EuiText>
        )}
        {conversation && selectedTab?.content({ conversation })}
      </EuiFlyoutBody>
    </>
  );
};
