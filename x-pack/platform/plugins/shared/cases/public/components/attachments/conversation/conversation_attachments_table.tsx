/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiInMemoryTable,
  EuiLink,
  EuiToolTip,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import type { CommonAttachmentListViewProps } from '../../../client/attachment_framework/types';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { useKibana } from '../../../common/lib/kibana';
import { useConversationAttachmentOpenedEBT } from '../../../analytics/use_conversation_attachment_ebt';
import { FormattedRelativePreferenceDate } from '../../formatted_date';
import { SavedObjectDeleteButton } from '../common/saved_object/saved_object_delete_button';
import { getConversationHref, isConversationAttachment } from './helpers';
import { useAgentBuilderAgents } from './use_agent_builder_agents';
import * as i18n from './translations';

interface ConversationRow {
  /** Cases attachment id. */
  id: string;
  conversationId: string;
  agentId: string;
  title: string;
  createdAt: string;
  createdBy: string;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const PAGINATION = { pageSizeOptions: PAGE_SIZE_OPTIONS, initialPageSize: PAGE_SIZE_OPTIONS[0] };

export const ConversationAttachmentsTable: React.FC<CommonAttachmentListViewProps> = ({
  caseData,
  searchTerm,
}) => {
  const { permissions } = useCasesContext();
  const {
    services: { agentBuilder, application },
  } = useKibana();
  const { nameById } = useAgentBuilderAgents();
  const trackOpened = useConversationAttachmentOpenedEBT();

  const rows = useMemo<ConversationRow[]>(() => {
    const term = searchTerm?.toLowerCase();
    return caseData.comments.flatMap((attachment) => {
      if (!isConversationAttachment(attachment)) {
        return [];
      }
      const agentId = attachment.metadata?.agentId ?? '';
      const row: ConversationRow = {
        id: attachment.id,
        conversationId: attachment.attachmentId,
        agentId,
        title: attachment.metadata?.title || i18n.UNTITLED_CONVERSATION,
        createdAt: attachment.createdAt,
        createdBy:
          attachment.createdBy?.fullName ||
          attachment.createdBy?.username ||
          attachment.createdBy?.email ||
          '',
      };
      const agentName = nameById.get(agentId) ?? agentId;
      return !term ||
        row.title.toLowerCase().includes(term) ||
        agentName.toLowerCase().includes(term)
        ? [row]
        : [];
    });
  }, [caseData.comments, nameById, searchTerm]);

  // Plain click opens the chat flyout over the case; the href keeps
  // Cmd/Ctrl+click and "open in new tab" working for the full page.
  const openChat = useCallback(
    (event: React.MouseEvent, row: ConversationRow) => {
      if (event.metaKey || event.ctrlKey) {
        return;
      }
      event.preventDefault();
      trackOpened('chat');
      agentBuilder?.openChat({ conversationId: row.conversationId, agentId: row.agentId });
    },
    [agentBuilder, trackOpened]
  );
  const trackFullPage = useCallback(() => trackOpened('full_page'), [trackOpened]);

  const columns = useMemo<Array<EuiBasicTableColumn<ConversationRow>>>(() => {
    const actions = [
      {
        name: i18n.OPEN_IN_AGENT_BUILDER,
        render: (row: ConversationRow) => (
          <EuiToolTip content={i18n.OPEN_IN_AGENT_BUILDER} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="external"
              aria-label={i18n.OPEN_IN_AGENT_BUILDER}
              href={getConversationHref(application, row)}
              onClick={trackFullPage}
              target="_blank"
              data-test-subj={`cases-conversation-attachments-table-open-${row.id}`}
            />
          </EuiToolTip>
        ),
      },
      ...(permissions.delete
        ? [
            {
              name: i18n.ACTIONS,
              render: (row: ConversationRow) => (
                <SavedObjectDeleteButton caseId={caseData.id} commentId={row.id} />
              ),
            },
          ]
        : []),
    ];

    return [
      {
        name: i18n.TITLE,
        field: 'title',
        render: (title: string, row: ConversationRow) => (
          <EuiLink
            href={getConversationHref(application, row)}
            onClick={(event: React.MouseEvent) => openChat(event, row)}
            data-test-subj={`cases-conversation-attachments-table-link-${row.id}`}
          >
            {title}
          </EuiLink>
        ),
      },
      {
        name: i18n.AGENT,
        field: 'agentId',
        render: (agentId: string) => nameById.get(agentId) ?? agentId,
      },
      {
        name: i18n.DATE_ADDED,
        field: 'createdAt',
        render: (createdAt: string) => <FormattedRelativePreferenceDate value={createdAt} />,
      },
      { name: i18n.ATTACHED_BY, field: 'createdBy' },
      { name: i18n.ACTIONS, width: '100px', actions },
    ];
  }, [application, caseData.id, nameById, openChat, permissions.delete, trackFullPage]);

  if (rows.length === 0) {
    return (
      <EuiEmptyPrompt
        title={<h3>{i18n.NO_CONVERSATIONS_ATTACHED}</h3>}
        titleSize="xs"
        data-test-subj="cases-conversation-attachments-table-empty"
      />
    );
  }

  return (
    <EuiInMemoryTable
      tableCaption={i18n.TABLE_CAPTION}
      items={rows}
      columns={columns}
      pagination={PAGINATION}
      data-test-subj="cases-conversation-attachments-table"
    />
  );
};

ConversationAttachmentsTable.displayName = 'ConversationAttachmentsTable';
