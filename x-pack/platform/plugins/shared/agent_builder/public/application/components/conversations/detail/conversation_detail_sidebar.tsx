/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useState } from 'react';
import type { Conversation } from '@kbn/agent-builder-common';
import { usePatchConversationMetadata } from '../../../hooks/use_patch_conversation_metadata';
import { ConversationMembers } from './conversation_members';
import { TemplateFieldRow } from './template_field_row';
import {
  getTemplateFieldDefinitions,
  getTemplateLabel,
  isCollaborativeTemplateConversation,
  resolveTemplateId,
} from './template_conversation_utils';
import { ConversationWorkflowHooks } from './conversation_workflow_hooks';
import { ConversationDetailTimelineTab } from './tabs/conversation_detail_timeline_tab';

const OBSERVABILITY_INVESTIGATION_TEMPLATE_ID = 'observability-investigation-v1';

enum ConversationDetailSidebarTab {
  metadata = 'metadata',
  timeline = 'timeline',
}

const labels = {
  metadataTab: i18n.translate('xpack.agentBuilder.conversationDetail.sidebar.metadataTab', {
    defaultMessage: 'Metadata',
  }),
  timelineTab: i18n.translate('xpack.agentBuilder.conversationDetail.sidebar.timelineTab', {
    defaultMessage: 'Timeline',
  }),
  templateFields: i18n.translate('xpack.agentBuilder.conversationDetail.sidebar.templateFields', {
    defaultMessage: 'Template fields',
  }),
  external: i18n.translate('xpack.agentBuilder.conversationDetail.sidebar.external', {
    defaultMessage: 'External',
  }),
  externalPlaceholder: i18n.translate(
    'xpack.agentBuilder.conversationDetail.sidebar.externalPlaceholder',
    {
      defaultMessage: 'No external references linked.',
    }
  ),
  workflows: i18n.translate('xpack.agentBuilder.conversationDetail.sidebar.workflows', {
    defaultMessage: 'Workflows',
  }),
  templateApplied: (template: string) =>
    i18n.translate('xpack.agentBuilder.conversationDetail.sidebar.templateApplied', {
      defaultMessage: 'Template: {template}',
      values: { template },
    }),
  sharedConversation: i18n.translate(
    'xpack.agentBuilder.conversationDetail.sidebar.sharedConversation',
    {
      defaultMessage: 'Shared conversation',
    }
  ),
};

interface ConversationDetailSidebarProps {
  conversation: Conversation;
}

export const ConversationDetailSidebar: React.FC<ConversationDetailSidebarProps> = ({
  conversation,
}) => {
  const { euiTheme } = useEuiTheme();
  const tabsId = useGeneratedHtmlId({ prefix: 'conversationDetailSidebarTabs' });
  const { mutate, isLoading } = usePatchConversationMetadata();
  const fieldDefinitions = getTemplateFieldDefinitions(conversation);
  const templateLabel = getTemplateLabel(conversation);
  const isCollaborative = isCollaborativeTemplateConversation(conversation);
  const showTimelineTab =
    resolveTemplateId(conversation) === OBSERVABILITY_INVESTIGATION_TEMPLATE_ID;
  const [selectedTab, setSelectedTab] = useState<ConversationDetailSidebarTab>(
    ConversationDetailSidebarTab.metadata
  );
  const selectedSidebarTab = showTimelineTab ? selectedTab : ConversationDetailSidebarTab.metadata;

  const panelStyles = css`
    height: 100%;
    overflow: auto;
    background: ${euiTheme.colors.backgroundBasePlain};
    border-inline-start: ${euiTheme.border.thin};
  `;

  const handleFieldChange = useCallback(
    (key: string, value: unknown) => {
      mutate({ [key]: value });
    },
    [mutate]
  );

  const tabs = [
    { id: ConversationDetailSidebarTab.metadata, label: labels.metadataTab },
    ...(showTimelineTab
      ? [{ id: ConversationDetailSidebarTab.timeline, label: labels.timelineTab }]
      : []),
  ];

  return (
    <EuiPanel css={panelStyles} paddingSize="m" hasShadow={false} hasBorder={false}>
      {isCollaborative && (
        <>
          <EuiBadge color="hollow">{labels.sharedConversation}</EuiBadge>
          <EuiSpacer size="s" />
        </>
      )}

      {templateLabel && (
        <>
          <EuiText size="xs" color="subdued">
            {labels.templateApplied(templateLabel)}
          </EuiText>
          <EuiSpacer size="m" />
        </>
      )}

      <EuiTabs bottomBorder size="s" id={tabsId}>
        {tabs.map((tab) => (
          <EuiTab
            key={tab.id}
            onClick={() => setSelectedTab(tab.id)}
            isSelected={selectedSidebarTab === tab.id}
            data-test-subj={`conversationDetailSidebarTab-${tab.id}`}
          >
            {tab.label}
          </EuiTab>
        ))}
      </EuiTabs>
      <EuiSpacer size="m" />

      {selectedSidebarTab === ConversationDetailSidebarTab.metadata && (
        <>
          <EuiTitle size="xxs">
            <h3>{labels.templateFields}</h3>
          </EuiTitle>
          <EuiSpacer size="s" />

          {fieldDefinitions.map((definition) => (
            <TemplateFieldRow
              key={definition.key}
              definition={definition}
              value={conversation.custom_fields?.[definition.key]}
              isSaving={isLoading}
              onChange={handleFieldChange}
            />
          ))}

          {isCollaborative && (
            <>
              <EuiHorizontalRule margin="m" />
              <ConversationMembers conversation={conversation} />
            </>
          )}

          <EuiHorizontalRule margin="m" />

          <EuiTitle size="xxs">
            <h3>{labels.external}</h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            {labels.externalPlaceholder}
          </EuiText>

          <EuiHorizontalRule margin="m" />

          <EuiTitle size="xxs">
            <h3>{labels.workflows}</h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <ConversationWorkflowHooks conversation={conversation} />
        </>
      )}

      {selectedSidebarTab === ConversationDetailSidebarTab.timeline && (
        <ConversationDetailTimelineTab timeline={conversation.custom_fields?.timeline} />
      )}
    </EuiPanel>
  );
};
