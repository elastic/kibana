/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAvatar,
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';
import type { Conversation } from '@kbn/agent-builder-common';
import { useAgentId } from '../../../hooks/use_conversation';
import { usePatchConversationMetadata } from '../../../hooks/use_patch_conversation_metadata';
import { TemplateFieldRow } from './template_field_row';
import {
  getTemplateFieldDefinitions,
  getTemplateLabel,
  isCollaborativeTemplateConversation,
} from './template_conversation_utils';

const labels = {
  templateFields: i18n.translate('xpack.agentBuilder.conversationDetail.sidebar.templateFields', {
    defaultMessage: 'Template fields',
  }),
  assignees: i18n.translate('xpack.agentBuilder.conversationDetail.sidebar.assignees', {
    defaultMessage: 'Assignees',
  }),
  assigneesPlaceholder: i18n.translate(
    'xpack.agentBuilder.conversationDetail.sidebar.assigneesPlaceholder',
    {
      defaultMessage: 'Assignee management is coming in a follow-up.',
    }
  ),
  external: i18n.translate('xpack.agentBuilder.conversationDetail.sidebar.external', {
    defaultMessage: 'External',
  }),
  externalPlaceholder: i18n.translate(
    'xpack.agentBuilder.conversationDetail.sidebar.externalPlaceholder',
    {
      defaultMessage: 'No external references linked.',
    }
  ),
  agent: i18n.translate('xpack.agentBuilder.conversationDetail.sidebar.agent', {
    defaultMessage: 'Agent',
  }),
  agentTrigger: i18n.translate('xpack.agentBuilder.conversationDetail.sidebar.agentTrigger', {
    defaultMessage: 'Trigger: @agent in collaborative mode',
  }),
  workflows: i18n.translate('xpack.agentBuilder.conversationDetail.sidebar.workflows', {
    defaultMessage: 'Workflows',
  }),
  workflowsPlaceholder: i18n.translate(
    'xpack.agentBuilder.conversationDetail.sidebar.workflowsPlaceholder',
    {
      defaultMessage: 'Workflow linking is coming in a follow-up.',
    }
  ),
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
  creator: (name: string) =>
    i18n.translate('xpack.agentBuilder.conversationDetail.sidebar.creator', {
      defaultMessage: 'Created by {name}',
      values: { name },
    }),
};

interface ConversationDetailSidebarProps {
  conversation: Conversation;
}

export const ConversationDetailSidebar: React.FC<ConversationDetailSidebarProps> = ({
  conversation,
}) => {
  const { euiTheme } = useEuiTheme();
  const agentId = useAgentId();
  const { mutate, isLoading } = usePatchConversationMetadata();
  const fieldDefinitions = getTemplateFieldDefinitions(conversation);
  const templateLabel = getTemplateLabel(conversation);
  const isCollaborative = isCollaborativeTemplateConversation(conversation);

  const panelStyles = css`
    height: 100%;
    overflow: auto;
    background: ${euiTheme.colors.backgroundBasePlain};
    border-inline-start: ${euiTheme.border.thin};
  `;

  const handleFieldChange = useCallback(
    (key: string, value: string) => {
      mutate({ [key]: value });
    },
    [mutate]
  );

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

      <EuiHorizontalRule margin="m" />

      <EuiTitle size="xxs">
        <h3>{labels.assignees}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiAvatar name={conversation.user.username} size="s" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s">{labels.creator(conversation.user.username)}</EuiText>
          <EuiText size="xs" color="subdued">
            {labels.assigneesPlaceholder}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

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
        <h3>{labels.agent}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s">
        <strong>{agentId}</strong>
      </EuiText>
      {isCollaborative && (
        <EuiText size="xs" color="subdued">
          {labels.agentTrigger}
        </EuiText>
      )}

      <EuiHorizontalRule margin="m" />

      <EuiTitle size="xxs">
        <h3>{labels.workflows}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        {labels.workflowsPlaceholder}
      </EuiText>
      <EuiSpacer size="s" />
      <EuiButtonEmpty size="xs" iconType="plusInCircle" isDisabled>
        {i18n.translate('xpack.agentBuilder.conversationDetail.sidebar.linkWorkflow', {
          defaultMessage: 'Link workflow',
        })}
      </EuiButtonEmpty>
    </EuiPanel>
  );
};
