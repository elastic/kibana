/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom-v5-compat';
import useLocalStorage from 'react-use/lib/useLocalStorage';

import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPopover,
  EuiSelectable,
  EuiText,
  EuiTextTruncate,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  ConversationDisplayStatus,
  ConversationRoundStatus,
  type ConversationWithoutRounds,
} from '@kbn/agent-builder-common';
import { appPaths } from '../../../../../utils/app_paths';
import { storageKeys } from '../../../../../storage_keys';
import { useStreamingContext } from '../../../../../context/streaming/streaming_context';
import { useConversationList } from '../../../../../hooks/use_conversation_list';
import {
  createConversationListItemStyles,
  createActiveConversationListItemStyles,
} from '../../../../conversations/conversation_list_item_styles';
import {
  isRunningInvestigationConversation,
  resolveTemplateId,
} from '../../../../conversations/detail/template_conversation_utils';
import { ConversationListItemRow } from './conversation_list_item_row';

// Conversations without a template share this synthetic filter id so they can be
// filtered as a single "Chat" group alongside the templated conversation types.
const NO_TEMPLATE_TYPE_ID = '__none__';

const filterLabels = {
  type: i18n.translate('xpack.agentBuilder.sidebar.conversationList.filter.type', {
    defaultMessage: 'Type',
  }),
  ariaLabel: i18n.translate('xpack.agentBuilder.sidebar.conversationList.filter.ariaLabel', {
    defaultMessage: 'Filter conversations by type',
  }),
  noMatches: i18n.translate('xpack.agentBuilder.sidebar.conversationList.filter.noMatches', {
    defaultMessage: 'No conversations match the selected types.',
  }),
  chat: i18n.translate('xpack.agentBuilder.sidebar.conversationList.filter.chat', {
    defaultMessage: 'Chat',
  }),
  investigation: i18n.translate(
    'xpack.agentBuilder.sidebar.conversationList.filter.investigation',
    { defaultMessage: 'Investigation' }
  ),
  incident: i18n.translate('xpack.agentBuilder.sidebar.conversationList.filter.incident', {
    defaultMessage: 'Incident',
  }),
  incidentTriage: i18n.translate(
    'xpack.agentBuilder.sidebar.conversationList.filter.incidentTriage',
    { defaultMessage: 'Incident triage' }
  ),
  researchNotes: i18n.translate(
    'xpack.agentBuilder.sidebar.conversationList.filter.researchNotes',
    { defaultMessage: 'Research notes' }
  ),
};

// Friendly labels for the known POC templates; unknown template ids fall back to the raw id.
const templateTypeLabels: Record<string, string> = {
  'observability-investigation-v1': filterLabels.investigation,
  'observability-incident-v1': filterLabels.incident,
  'incident-triage-v2': filterLabels.incidentTriage,
  'research-notes-v1': filterLabels.researchNotes,
};

const getTypeId = (conversation: ConversationWithoutRounds): string =>
  resolveTemplateId(conversation) ?? NO_TEMPLATE_TYPE_ID;

const getTypeLabel = (typeId: string): string => {
  if (typeId === NO_TEMPLATE_TYPE_ID) {
    return filterLabels.chat;
  }
  return templateTypeLabels[typeId] ?? typeId;
};

const byRecencyDesc = (a: ConversationWithoutRounds, b: ConversationWithoutRounds): number =>
  new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();

const deriveDisplayStatus = (
  conversation: { read?: boolean; status?: ConversationRoundStatus },
  isStreaming: boolean,
  hasError: boolean,
  isActive: boolean
): ConversationDisplayStatus | undefined => {
  if (isStreaming || conversation.status === ConversationRoundStatus.inProgress) {
    return ConversationDisplayStatus.inProgress;
  }
  if (hasError) {
    return ConversationDisplayStatus.error;
  }
  if (conversation.status === ConversationRoundStatus.awaitingPrompt) {
    return ConversationDisplayStatus.awaitingPrompt;
  }
  // Do not show the "unread" status for the "active" (current) conversation.
  // Since the user is actively viewing it, a request to mark it as read has likely already been sent.
  if (conversation.read === false && !isActive) {
    return ConversationDisplayStatus.unread;
  }
  return undefined;
};

const newConversationLabel = i18n.translate(
  'xpack.agentBuilder.sidebar.conversation.newConversation',
  { defaultMessage: 'New conversation' }
);

interface ConversationListProps {
  agentId: string;
  currentConversationId: string | undefined;
  isNewConversationRoute: boolean;
  onItemClick?: (conversationId: string) => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  agentId,
  currentConversationId,
  isNewConversationRoute,
  onItemClick,
}) => {
  const { euiTheme } = useEuiTheme();
  const { conversations = [], isLoading } = useConversationList({ agentId });
  const { activeStreams, byConversationId } = useStreamingContext();
  const [selectedTypes = [], setSelectedTypes] = useLocalStorage<string[]>(
    storageKeys.conversationListTypeFilter,
    []
  );
  const [isTypeFilterOpen, setIsTypeFilterOpen] = useState(false);

  // Distinct template types present in the list, so the filter only offers types that exist.
  const availableTypes = useMemo(() => {
    const ids = new Set<string>();
    for (const conversation of conversations) {
      ids.add(getTypeId(conversation));
    }
    return [...ids].sort((a, b) => {
      // Untemplated "Chat" always sorts last; the rest sort by their display label.
      if (a === NO_TEMPLATE_TYPE_ID) return 1;
      if (b === NO_TEMPLATE_TYPE_ID) return -1;
      return getTypeLabel(a).localeCompare(getTypeLabel(b));
    });
  }, [conversations]);

  // Only filter by types that still exist; drops stale ids from a previous session.
  const activeSelectedTypes = useMemo(
    () => selectedTypes.filter((typeId) => availableTypes.includes(typeId)),
    [selectedTypes, availableTypes]
  );

  const visibleConversations = useMemo(() => {
    const sorted = [...conversations].sort((a, b) => {
      const aInProgress =
        activeStreams.has(a.id) || a.status === ConversationRoundStatus.inProgress;
      const bInProgress =
        activeStreams.has(b.id) || b.status === ConversationRoundStatus.inProgress;
      if (aInProgress !== bInProgress) return aInProgress ? -1 : 1;
      return byRecencyDesc(a, b);
    });
    if (activeSelectedTypes.length === 0) {
      return sorted;
    }
    const selected = new Set(activeSelectedTypes);
    return sorted.filter((conversation) => selected.has(getTypeId(conversation)));
  }, [conversations, activeStreams, activeSelectedTypes]);

  const typeFilterOptions: EuiSelectableOption[] = useMemo(
    () =>
      availableTypes.map((typeId) => ({
        label: getTypeLabel(typeId),
        key: typeId,
        checked: activeSelectedTypes.includes(typeId) ? 'on' : undefined,
      })),
    [availableTypes, activeSelectedTypes]
  );

  const linkStyles = createConversationListItemStyles(euiTheme);
  const activeLinkStyles = createActiveConversationListItemStyles(euiTheme);

  if (isLoading) {
    return (
      <EuiFlexGroup direction="column" gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="s" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  // If there are no conversations, show 1 mock conversation item that links to the new conversation route
  if (conversations.length === 0) {
    return (
      <EuiFlexGroup direction="column" gutterSize="xs">
        <EuiFlexItem grow={false}>
          <Link
            to={appPaths.agent.conversations.new({ agentId })}
            css={isNewConversationRoute ? activeLinkStyles : linkStyles}
            data-test-subj="agentBuilderSidebarConversation-new"
          >
            <EuiTextTruncate text={newConversationLabel} />
          </Link>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  // A single type offers nothing to filter, so the control is only shown when there are several.
  const showTypeFilter = availableTypes.length > 1;

  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      {showTypeFilter && (
        <EuiFlexItem grow={false}>
          <EuiFilterGroup
            fullWidth
            css={css`
              margin-bottom: ${euiTheme.size.xs};
            `}
          >
            <EuiPopover
              id="agentBuilderSidebarConversationTypeFilter"
              button={
                <EuiFilterButton
                  iconType="arrowDown"
                  badgeColor="success"
                  onClick={() => setIsTypeFilterOpen((open) => !open)}
                  isSelected={isTypeFilterOpen}
                  numFilters={availableTypes.length}
                  hasActiveFilters={activeSelectedTypes.length > 0}
                  numActiveFilters={activeSelectedTypes.length}
                  grow
                  data-test-subj="agentBuilderSidebarConversationTypeFilterButton"
                >
                  {filterLabels.type}
                </EuiFilterButton>
              }
              isOpen={isTypeFilterOpen}
              closePopover={() => setIsTypeFilterOpen(false)}
              panelPaddingSize="none"
            >
              <EuiSelectable
                aria-label={filterLabels.ariaLabel}
                options={typeFilterOptions}
                onChange={(options) =>
                  setSelectedTypes(
                    options
                      .filter((option) => option.checked === 'on')
                      .map((option) => option.key as string)
                  )
                }
                data-test-subj="agentBuilderSidebarConversationTypeFilterOptions"
              >
                {(list) => (
                  <div
                    css={css`
                      width: 240px;
                    `}
                  >
                    {list}
                  </div>
                )}
              </EuiSelectable>
            </EuiPopover>
          </EuiFilterGroup>
        </EuiFlexItem>
      )}
      {visibleConversations.length === 0 ? (
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued" textAlign="center">
            {filterLabels.noMatches}
          </EuiText>
        </EuiFlexItem>
      ) : (
        visibleConversations.map((conversation) => {
          const isActive = currentConversationId === conversation.id;
          const isStreaming = activeStreams.has(conversation.id);
          const hasError = Boolean(byConversationId[conversation.id]?.error);
          const isRunningInvestigation = isRunningInvestigationConversation(conversation);
          // The dedicated "Investigating" badge stands in for the generic in-progress spinner.
          const status = isRunningInvestigation
            ? undefined
            : deriveDisplayStatus(conversation, isStreaming, hasError, isActive);
          return (
            <EuiFlexItem grow={false} key={conversation.id}>
              <ConversationListItemRow
                agentId={agentId}
                conversationId={conversation.id}
                title={conversation.title || conversation.id}
                owner={conversation.user}
                isActive={isActive}
                routeConversationId={currentConversationId}
                showActionsMenu={!isStreaming}
                onItemClick={onItemClick ? () => onItemClick(conversation.id) : undefined}
                status={status}
                read={conversation.read}
                isRunningInvestigation={isRunningInvestigation}
              />
            </EuiFlexItem>
          );
        })
      )}
    </EuiFlexGroup>
  );
};
