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
import React, { useMemo, useState } from 'react';
import type { Conversation } from '@kbn/agent-builder-common';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { useToasts } from '../../../hooks/use_toasts';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { ConversationRightActions } from '../conversation_header/conversation_actions_right';
import { TemplateHeaderActions } from './template_header_actions';
import {
  getFieldBadgeColor,
  getTemplateHeaderActions,
  getTemplateHeaderFields,
  getTemplateLabel,
  isCollaborativeTemplateConversation,
  resolveTemplateId,
} from './template_conversation_utils';

const labels = {
  untitled: i18n.translate('xpack.agentBuilder.conversationDetail.header.untitled', {
    defaultMessage: 'Untitled conversation',
  }),
  incidentCreated: i18n.translate('xpack.agentBuilder.conversationDetail.header.incidentCreated', {
    defaultMessage: 'Incident conversation created',
  }),
  incidentCreateFailed: i18n.translate(
    'xpack.agentBuilder.conversationDetail.header.incidentCreateFailed',
    {
      defaultMessage: 'Unable to create incident conversation',
    }
  ),
  incidentExistsTooltip: i18n.translate(
    'xpack.agentBuilder.conversationDetail.header.incidentExistsTooltip',
    {
      defaultMessage: 'This investigation is already linked to an incident conversation',
    }
  ),
};

const OBSERVABILITY_INVESTIGATION_TEMPLATE_ID = 'observability-investigation-v1';
const CREATE_OBSERVABILITY_INCIDENT_ACTION_ID = 'create-observability-incident';

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
  const { conversationsService, openSidebarConversation } = useAgentBuilderServices();
  const { conversationActions } = useConversationContext();
  const { addSuccessToast, addErrorToast } = useToasts();
  const [isCreatingIncident, setIsCreatingIncident] = useState(false);
  const title = conversation?.title || labels.untitled;
  const headerFields = conversation ? getTemplateHeaderFields(conversation) : [];
  const headerActions = useMemo(() => {
    if (!conversation) {
      return [];
    }

    return getTemplateHeaderActions(conversation).map((action) => {
      if (
        action.id !== CREATE_OBSERVABILITY_INCIDENT_ACTION_ID ||
        resolveTemplateId(conversation) !== OBSERVABILITY_INVESTIGATION_TEMPLATE_ID
      ) {
        return action;
      }

      const incidentConversationId = conversation.custom_fields?.incident_conversation_id;
      const hasIncidentConversation = typeof incidentConversationId === 'string';

      return {
        ...action,
        enabled: !hasIncidentConversation && !isCreatingIncident,
        isLoading: isCreatingIncident,
        tooltip: hasIncidentConversation ? labels.incidentExistsTooltip : action.tooltip,
        onClick: async () => {
          setIsCreatingIncident(true);
          try {
            const { incidentConversation } =
              await conversationsService.createIncidentFromInvestigation({
                conversationId: conversation.id,
              });
            addSuccessToast({ title: labels.incidentCreated });
            conversationActions.invalidateConversation();
            openSidebarConversation({ conversationId: incidentConversation.id });
          } catch {
            addErrorToast({ title: labels.incidentCreateFailed });
          } finally {
            setIsCreatingIncident(false);
          }
        },
      };
    });
  }, [
    addErrorToast,
    addSuccessToast,
    conversation,
    conversationActions,
    conversationsService,
    isCreatingIncident,
    openSidebarConversation,
  ]);
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
