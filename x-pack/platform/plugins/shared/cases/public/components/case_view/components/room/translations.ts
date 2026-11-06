/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

const t = (id: string, defaultMessage: string) =>
  i18n.translate(`xpack.cases.room.${id}`, { defaultMessage });

export const ROOM_BUTTON = i18n.translate('xpack.cases.caseView.room.button', {
  defaultMessage: 'Room',
});
export const TITLE = t('title', 'Room');
export const CLOSE = t('close', 'Close the room');
export const SUBTITLE_RESTRICTED = (number: string, count: number) =>
  i18n.translate('xpack.cases.room.subtitle.restricted', {
    defaultMessage:
      'Case {number} · Restricted to the {count, plural, one {# assignee} other {# assignees}}',
    values: { number, count },
  });
export const SUBTITLE_PUBLIC = (number: string) =>
  i18n.translate('xpack.cases.room.subtitle.public', {
    defaultMessage: 'Case {number} · Everyone with access to this case',
    values: { number },
  });
export const AGENT_ON = t('agentToggle.on', 'Agent: on');
export const AGENT_OFF = t('agentToggle.off', 'Agent: off');
export const AGENT_TOOLTIP = t(
  'agentToggle.tooltip',
  'When on, Elastic AI Agent replies when someone mentions it in this room. It reads this case and the linked investigations.'
);
export const AGENT_NAME = t('agentName', 'Elastic AI Agent');
export const AGENT_INITIALS = t('agentInitials', 'AI');
export const LINKED_CHATS = (count: number) =>
  i18n.translate('xpack.cases.room.linkedInvestigations', {
    defaultMessage: 'Linked investigations · {count}',
    values: { count },
  });
export const OPEN_CHAT = t('openChat', 'Open chat');
export const CHATS_NOTE = t(
  'chatsNote',
  "Each investigation keeps its own chat in Agent Builder. This room is the team's chat for the case."
);
export const POST_TO_CASE = t('postToCase', 'Post to case');
export const POSTED_TO_CASE = t('postedToCase', 'Posted to case');
export const POSTED_TOAST_TITLE = t('postedToast.title', 'Posted to case');
export const POSTED_TOAST_TEXT = t(
  'postedToast.text',
  'The message is now a comment in the case activity.'
);
export const POST_ERROR = t('postError', "Couldn't post the message to the case");
export const PLACEHOLDER_WITH_AGENT = t(
  'placeholder.withAgent',
  'Message the room. Enter @ to mention a teammate or the agent.'
);
export const PLACEHOLDER_TEAM_ONLY = t(
  'placeholder.teamOnly',
  'Message the room. Enter @ to mention a teammate.'
);
export const HINT_WITH_AGENT = t('hint.withAgent', '@Elastic AI Agent to ask the agent');
export const HINT_AGENT_OFF = t('hint.agentOff', 'The agent is off for this case');
export const SEND = t('send', 'Send');
export const REPLYING = t('replying', 'Elastic AI Agent is replying...');
export const NO_AGENT_BUILDER = t(
  'noAgentBuilder',
  'Team chat only. Chatting with Elastic AI Agent needs Agent Builder access.'
);
export const READ_ONLY = t(
  'readOnly',
  'You have read-only access to this case. Posting in the room needs the Cases update privilege.'
);
export const NO_CONNECTOR = t(
  'noConnector',
  "Elastic AI Agent can't reply because no AI connector is set up in this space. Your message is in the room."
);
export const SEND_ERROR = t('sendError', "Couldn't send the message");
export const LOAD_ERROR_TITLE = t('loadError.title', "The room couldn't be loaded");
export const RETRY = t('retry', 'Try again');
export const EMPTY = t('empty', 'No messages yet. Start the conversation for this case.');
export const MESSAGE_LIST = t('messageList', 'Room messages');
export const COMPOSER_LABEL = t('composerLabel', 'Message');
export const MENTION_LIST = t('mentionList', 'Mention someone');
export const UNKNOWN_AUTHOR = t('unknownAuthor', 'A teammate');
export const AGENT_WAITING = t(
  'agentWaiting',
  'Elastic AI Agent is waiting for you to confirm a change before it continues.'
);
export const ANSWER_IN_AGENT_BUILDER = t('answerInAgentBuilder', 'Confirm in Agent Builder');
export const ROOM_OWNER_STAYS_ASSIGNED_TITLE = (name: string) =>
  i18n.translate('xpack.cases.room.ownerStaysAssigned.title', {
    defaultMessage: '{name} stays assigned',
    values: { name },
  });
export const ROOM_OWNER_STAYS_ASSIGNED_TEXT = (name: string) =>
  i18n.translate('xpack.cases.room.ownerStaysAssigned.text', {
    defaultMessage:
      "{name} opened this case's room and owns it, so they can't be removed from the assignees while the room exists. Your other changes were saved.",
    values: { name },
  });
