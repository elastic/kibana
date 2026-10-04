/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CONVERSATIONS = i18n.translate('xpack.cases.attachments.conversation.displayName', {
  defaultMessage: 'Conversations',
});

export const ADDED_CONVERSATION = i18n.translate(
  'xpack.cases.attachments.conversation.addedConversation',
  { defaultMessage: 'added conversation' }
);

export const REMOVED_CONVERSATION = i18n.translate(
  'xpack.cases.attachments.conversation.removedConversation',
  { defaultMessage: 'removed conversation' }
);

export const DELETE_CONVERSATION_SUCCESS_TOAST = i18n.translate(
  'xpack.cases.attachments.conversation.deleteSuccessTitle',
  { defaultMessage: 'Deleted conversation attachment' }
);

export const UNTITLED_CONVERSATION = i18n.translate(
  'xpack.cases.attachments.conversation.untitled',
  { defaultMessage: 'Untitled conversation' }
);

export const OPEN_IN_AGENT_BUILDER = i18n.translate(
  'xpack.cases.attachments.conversation.openInAgentBuilder',
  { defaultMessage: 'Open in Agent Builder' }
);

export const TITLE = i18n.translate('xpack.cases.attachments.conversation.table.title', {
  defaultMessage: 'Title',
});

export const AGENT = i18n.translate('xpack.cases.attachments.conversation.table.agent', {
  defaultMessage: 'Agent',
});

export const VISIBILITY = i18n.translate('xpack.cases.attachments.conversation.table.visibility', {
  defaultMessage: 'Visibility',
});

export const DATE_ADDED = i18n.translate('xpack.cases.attachments.conversation.table.dateAdded', {
  defaultMessage: 'Date added',
});

export const ATTACHED_BY = i18n.translate('xpack.cases.attachments.conversation.table.attachedBy', {
  defaultMessage: 'Attached by',
});

export const ACTIONS = i18n.translate('xpack.cases.attachments.conversation.table.actions', {
  defaultMessage: 'Actions',
});

export const TABLE_CAPTION = i18n.translate('xpack.cases.attachments.conversation.table.caption', {
  defaultMessage: 'Conversation attachments table',
});

export const NO_CONVERSATIONS_ATTACHED = i18n.translate(
  'xpack.cases.attachments.conversation.table.empty',
  { defaultMessage: 'No conversations have been attached to this case yet.' }
);

export const MODAL_TITLE = i18n.translate('xpack.cases.caseView.attach.conversationModal.title', {
  defaultMessage: 'Attach conversation',
});

export const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.cases.caseView.attach.conversationModal.searchPlaceholder',
  { defaultMessage: 'Search conversations' }
);

export const FILTER_AGENT_LABEL = i18n.translate(
  'xpack.cases.caseView.attach.conversationModal.filterAgentLabel',
  { defaultMessage: 'Filter by agent' }
);

export const FILTER_ALL_AGENTS = i18n.translate(
  'xpack.cases.caseView.attach.conversationModal.filterAllAgents',
  { defaultMessage: 'All agents' }
);

export const ACCESS_NOTE = i18n.translate(
  'xpack.cases.caseView.attach.conversationModal.accessNote',
  { defaultMessage: 'Only people who can open a conversation see it on the case.' }
);

export const VISIBILITY_PUBLIC = i18n.translate(
  'xpack.cases.caseView.attach.conversationModal.visibilityPublic',
  { defaultMessage: 'Public' }
);

export const VISIBILITY_PRIVATE = i18n.translate(
  'xpack.cases.caseView.attach.conversationModal.visibilityPrivate',
  { defaultMessage: 'Private' }
);

export const UPDATED = i18n.translate(
  'xpack.cases.caseView.attach.conversationModal.updatedPrefix',
  { defaultMessage: 'Updated' }
);

export const ATTACH_ACTION = i18n.translate(
  'xpack.cases.caseView.attach.conversationModal.attachAction',
  { defaultMessage: 'Attach' }
);

export const ATTACH_ACTION_ARIA_LABEL = (title: string) =>
  i18n.translate('xpack.cases.caseView.attach.conversationModal.attachActionAriaLabel', {
    defaultMessage: 'Attach conversation {title}',
    values: { title },
  });

export const ATTACHED_ACTION = i18n.translate(
  'xpack.cases.caseView.attach.conversationModal.attachedAction',
  { defaultMessage: 'Attached' }
);

export const CONVERSATION_LIST_LABEL = i18n.translate(
  'xpack.cases.caseView.attach.conversationModal.listLabel',
  { defaultMessage: 'Conversations' }
);

export const EMPTY_TITLE = i18n.translate(
  'xpack.cases.caseView.attach.conversationModal.emptyTitle',
  { defaultMessage: 'No conversations yet' }
);

export const EMPTY_BODY = i18n.translate(
  'xpack.cases.caseView.attach.conversationModal.emptyBody',
  { defaultMessage: 'Start a conversation in Agent Builder, then attach it here.' }
);

export const NO_RESULTS_TITLE = i18n.translate(
  'xpack.cases.caseView.attach.conversationModal.noResultsTitle',
  { defaultMessage: 'No conversations found' }
);

export const NO_RESULTS_BODY = i18n.translate(
  'xpack.cases.caseView.attach.conversationModal.noResultsBody',
  { defaultMessage: 'Try a different search or agent.' }
);

export const FETCH_ERROR_TITLE = i18n.translate(
  'xpack.cases.caseView.attach.conversationModal.fetchErrorTitle',
  { defaultMessage: "Conversations couldn't be loaded" }
);

export const FETCH_ERROR_BODY = i18n.translate(
  'xpack.cases.caseView.attach.conversationModal.fetchErrorBody',
  {
    defaultMessage:
      'Try again. If the problem continues, check that Agent Builder is available in this space.',
  }
);

export const TRY_AGAIN = i18n.translate('xpack.cases.caseView.attach.conversationModal.tryAgain', {
  defaultMessage: 'Try again',
});

export const ATTACH_SUCCESS_TITLE = (title: string) =>
  i18n.translate('xpack.cases.caseView.attach.conversation.successAddedToCase', {
    defaultMessage: 'Added conversation {title} to case',
    values: { title },
  });
