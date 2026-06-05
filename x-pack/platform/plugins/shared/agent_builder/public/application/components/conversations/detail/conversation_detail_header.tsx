/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { Conversation } from '@kbn/agent-builder-common';
import { ConversationRightActions } from '../conversation_header/conversation_actions_right';
import { TemplateHeaderActions } from './template_header_actions';
import {
  getFieldBadgeColor,
  getTemplateHeaderActions,
  getTemplateHeaderFields,
  getTemplateLabel,
  isCollaborativeTemplateConversation,
} from './template_conversation_utils';

const labels = {
  untitled: i18n.translate('xpack.agentBuilder.conversationDetail.header.untitled', {
    defaultMessage: 'Untitled conversation',
  }),
};

interface ConversationDetailHeaderProps {
  conversation?: Conversation;
  isLoading?: boolean;
  onClose?: () => void;
  ariaLabelledBy?: string;
}

export const ConversationDetailHeader: React.FC<ConversationDetailHeaderProps> = ({
  conversation,
  isLoading,
  onClose,
  ariaLabelledBy,
}) => {
  const title = conversation?.title || labels.untitled;
  const headerFields = conversation ? getTemplateHeaderFields(conversation) : [];
  const headerActions = conversation ? getTemplateHeaderActions(conversation) : [];
  const templateLabel = conversation ? getTemplateLabel(conversation) : '';
  const isCollaborative = isCollaborativeTemplateConversation(conversation);

  return (
    <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
      <EuiFlexItem grow>
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
              {headerFields.map(({ definition, value }) => (
                <EuiFlexItem grow={false} key={definition.key}>
                  <EuiBadge color={getFieldBadgeColor(definition, value)}>{value}</EuiBadge>
                </EuiFlexItem>
              ))}
              <EuiFlexItem>
                <EuiTitle size="xs" id={ariaLabelledBy}>
                  <h1>{isLoading ? <EuiLoadingSpinner size="m" /> : title}</h1>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          {(templateLabel || isCollaborative) && (
            <EuiFlexItem>
              <EuiText size="xs" color="subdued">
                {[templateLabel, isCollaborative ? 'collaborative' : undefined]
                  .filter(Boolean)
                  .join(' · ')}
              </EuiText>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <TemplateHeaderActions actions={headerActions} />
          <EuiFlexItem grow={false}>
            <ConversationRightActions onClose={onClose} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
