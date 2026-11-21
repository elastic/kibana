/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

const PREFIX = 'xpack.cases.investigations.conversation';

/* ------------------------------ Header and threads ------------------------------ */

export const MAIN_CONVERSATION = i18n.translate(`${PREFIX}.mainConversation`, {
  defaultMessage: 'Main conversation',
});
export const MAIN_CONVERSATION_TITLE = (displayId: string) =>
  i18n.translate(`${PREFIX}.mainConversationTitle`, {
    defaultMessage: 'Conversation on {displayId}',
    values: { displayId },
  });
export const THREADS = i18n.translate(`${PREFIX}.threads`, { defaultMessage: 'Threads' });
export const THREADS_COUNT = (count: number) =>
  i18n.translate(`${PREFIX}.threadsCount`, {
    defaultMessage: 'Threads, {count}',
    values: { count },
  });
export const NO_THREADS = i18n.translate(`${PREFIX}.noThreads`, {
  defaultMessage: 'No threads yet. Start one to discuss a message on the side.',
});
export const NEW_THREAD = i18n.translate(`${PREFIX}.newThread`, {
  defaultMessage: 'New thread',
});
export const BACK_TO_MAIN = i18n.translate(`${PREFIX}.backToMain`, {
  defaultMessage: 'Back to the main conversation',
});
export const THREAD_META = (creator: string) =>
  i18n.translate(`${PREFIX}.threadMeta`, {
    defaultMessage: 'Started by {creator}',
    values: { creator },
  });
export const THREAD_ANCHOR = (anchor: string) =>
  i18n.translate(`${PREFIX}.threadAnchor`, {
    defaultMessage: 'On {anchor}',
    values: { anchor },
  });
export const PARTICIPANTS = i18n.translate(`${PREFIX}.participants`, {
  defaultMessage: 'Participants',
});
export const MESSAGES_COUNT = (count: number) =>
  i18n.translate(`${PREFIX}.messagesCount`, {
    defaultMessage: '{count, plural, one {# message} other {# messages}}',
    values: { count },
  });
export const HEADER_HINT = i18n.translate(`${PREFIX}.headerHint`, {
  defaultMessage: 'Claims you create from messages appear in Claims.',
});

export const NEW_THREAD_TITLE = i18n.translate(`${PREFIX}.newThreadTitle`, {
  defaultMessage: 'Start a thread',
});
export const NEW_THREAD_FIELD_TITLE = i18n.translate(`${PREFIX}.newThreadFieldTitle`, {
  defaultMessage: 'Thread title',
});
export const NEW_THREAD_TITLE_PLACEHOLDER = i18n.translate(`${PREFIX}.newThreadTitlePlaceholder`, {
  defaultMessage: 'What do you want to discuss?',
});
export const NEW_THREAD_TITLE_REQUIRED = i18n.translate(`${PREFIX}.newThreadTitleRequired`, {
  defaultMessage: 'Enter a title for the thread.',
});
export const NEW_THREAD_FIELD_ANCHOR = i18n.translate(`${PREFIX}.newThreadFieldAnchor`, {
  defaultMessage: 'Anchor to a message (optional)',
});
export const NEW_THREAD_ANCHOR_NONE = i18n.translate(`${PREFIX}.newThreadAnchorNone`, {
  defaultMessage: 'No anchor',
});
export const NEW_THREAD_ANCHOR_HELP = i18n.translate(`${PREFIX}.newThreadAnchorHelp`, {
  defaultMessage: 'The anchor records which message of the main conversation the thread is about.',
});
export const NEW_THREAD_CREATE = i18n.translate(`${PREFIX}.newThreadCreate`, {
  defaultMessage: 'Start thread',
});
export const NEW_THREAD_SUCCESS = (title: string) =>
  i18n.translate(`${PREFIX}.newThreadSuccess`, {
    defaultMessage: 'Started the thread {title}.',
    values: { title },
  });
export const CANCEL = i18n.translate(`${PREFIX}.cancel`, { defaultMessage: 'Cancel' });

/* ------------------------------ Embedded chat ------------------------------ */

export const CHAT_LOADING = i18n.translate(`${PREFIX}.chatLoading`, {
  defaultMessage: 'Loading the conversation',
});
export const CONVERSATION_LOAD_ERROR = i18n.translate(`${PREFIX}.conversationLoadError`, {
  defaultMessage: 'Could not load the conversation.',
});
export const EXPAND = i18n.translate(`${PREFIX}.expand`, { defaultMessage: 'Expand' });
export const EXPAND_ARIA = i18n.translate(`${PREFIX}.expandAria`, {
  defaultMessage: 'Open the conversation in the Conversation tab',
});

/* ------------------------------ Create claim from conversation ------------------------------ */

export const CREATE_CLAIM = i18n.translate(`${PREFIX}.createClaim`, {
  defaultMessage: 'Create claim from conversation',
});
export const PICKER_TITLE = i18n.translate(`${PREFIX}.pickerTitle`, {
  defaultMessage: 'Create a claim from a message',
});
export const PICKER_HELP = i18n.translate(`${PREFIX}.pickerHelp`, {
  defaultMessage:
    'Choose the message the claim is based on. The claim keeps a link back to it, so reviewers can see where it came from.',
});
export const PICKER_EMPTY = i18n.translate(`${PREFIX}.pickerEmpty`, {
  defaultMessage: 'There are no messages in this conversation yet.',
});
export const PICKER_LOADING = i18n.translate(`${PREFIX}.pickerLoading`, {
  defaultMessage: 'Loading messages',
});
export const PICKER_SEARCH = i18n.translate(`${PREFIX}.pickerSearch`, {
  defaultMessage: 'Search messages',
});
export const PICKER_SELECT_MESSAGE = (label: string) =>
  i18n.translate(`${PREFIX}.pickerSelectMessage`, {
    defaultMessage: 'Use {label} for the claim',
    values: { label },
  });
export const PICKER_CONTINUE = i18n.translate(`${PREFIX}.pickerContinue`, {
  defaultMessage: 'Continue',
});
export const PICKER_NO_MATCH = i18n.translate(`${PREFIX}.pickerNoMatch`, {
  defaultMessage: 'No messages match your search.',
});
export const MESSAGE_LABEL = (index: number) =>
  i18n.translate(`${PREFIX}.messageLabel`, {
    defaultMessage: 'Message {index}',
    values: { index },
  });
export const MESSAGE_BY_LABEL = (author: string) =>
  i18n.translate(`${PREFIX}.messageByLabel`, {
    defaultMessage: 'Message by {author}',
    values: { author },
  });
export const SKIPPED_AGENT = i18n.translate(`${PREFIX}.skippedAgent`, {
  defaultMessage: 'No agent reply',
});
export const AGENT_BADGE = i18n.translate(`${PREFIX}.agentBadge`, {
  defaultMessage: 'Agent',
});
export const CLAIM_FORM_TITLE = i18n.translate(`${PREFIX}.claimFormTitle`, {
  defaultMessage: 'New claim',
});
export const CLAIM_QUESTION = i18n.translate(`${PREFIX}.claimQuestion`, {
  defaultMessage: 'Question or statement',
});
export const CLAIM_QUESTION_REQUIRED = i18n.translate(`${PREFIX}.claimQuestionRequired`, {
  defaultMessage: 'Enter the question or statement for the claim.',
});
export const CLAIM_SUPPORTED_NEEDS_STATEMENT = i18n.translate(
  `${PREFIX}.claimSupportedNeedsStatement`,
  { defaultMessage: 'A supported claim must be a statement, not a question.' }
);
export const CLAIM_CONCLUSION = i18n.translate(`${PREFIX}.claimConclusion`, {
  defaultMessage: 'Conclusion (optional)',
});
export const CLAIM_CONCLUSION_HELP = i18n.translate(`${PREFIX}.claimConclusionHelp`, {
  defaultMessage: 'What the message tells you. Leave empty while the claim is open.',
});
export const CLAIM_STATUS = i18n.translate(`${PREFIX}.claimStatus`, {
  defaultMessage: 'Start as',
});
export const CLAIM_STATUS_OPEN = i18n.translate(`${PREFIX}.claimStatusOpen`, {
  defaultMessage: 'Open',
});
export const CLAIM_STATUS_SUPPORTED = i18n.translate(`${PREFIX}.claimStatusSupported`, {
  defaultMessage: 'Supported',
});
export const CLAIM_SOURCE = i18n.translate(`${PREFIX}.claimSource`, {
  defaultMessage: 'Source message',
});
export const CLAIM_BACK = i18n.translate(`${PREFIX}.claimBack`, { defaultMessage: 'Back' });
export const CLAIM_ADD = i18n.translate(`${PREFIX}.claimAdd`, { defaultMessage: 'Add claim' });
export const CLAIM_ADDED = (ref: string) =>
  i18n.translate(`${PREFIX}.claimAdded`, {
    defaultMessage: 'Added {ref} to Claims.',
    values: { ref },
  });
export const CLAIM_ADDED_GENERIC = i18n.translate(`${PREFIX}.claimAddedGeneric`, {
  defaultMessage: 'Added the claim.',
});
export const CLAIM_CLOSED = i18n.translate(`${PREFIX}.claimClosed`, {
  defaultMessage: 'This investigation is closed. Reopen it to add claims.',
});
export const CLAIM_ALREADY_PINNED = (ref: string) =>
  i18n.translate(`${PREFIX}.claimAlreadyPinned`, {
    defaultMessage: 'Already a claim: {ref}',
    values: { ref },
  });

/* ------------------------------ Thread summary ------------------------------ */

export const THREAD_SUMMARY_SHOW = i18n.translate(`${PREFIX}.threadSummaryShow`, {
  defaultMessage: 'Summarize this thread',
});
export const THREAD_SUMMARY_PROMPT = i18n.translate(`${PREFIX}.threadSummaryPrompt`, {
  defaultMessage: 'Summarise this thread',
});
export const THREAD_SUMMARY_SENT = i18n.translate(`${PREFIX}.threadSummarySent`, {
  defaultMessage: 'The agent summarized the thread. The summary is the last message of the thread.',
});
export const THREAD_SUMMARY_ERROR = i18n.translate(`${PREFIX}.threadSummaryError`, {
  defaultMessage: 'The agent could not summarize the thread.',
});
export const THREAD_SUMMARY_EMPTY = i18n.translate(`${PREFIX}.threadSummaryEmpty`, {
  defaultMessage: 'There is nothing to summarize yet. Send a message in the thread first.',
});
export const THREAD_SUMMARY_DETERMINISTIC_TITLE = i18n.translate(
  `${PREFIX}.threadSummaryDeterministicTitle`,
  { defaultMessage: 'Summary of this thread' }
);
export const THREAD_SUMMARY_DETERMINISTIC = (
  count: number,
  authors: string,
  lastAuthor: string,
  lastText: string
) =>
  i18n.translate(`${PREFIX}.threadSummaryDeterministic`, {
    defaultMessage:
      '{count, plural, one {# message} other {# messages}} from {authors}. Last message, by {lastAuthor}: {lastText}',
    values: { count, authors, lastAuthor, lastText },
  });
export const THREAD_SUMMARY_CLOSE = i18n.translate(`${PREFIX}.threadSummaryClose`, {
  defaultMessage: 'Hide summary',
});
export const THREAD_SUMMARY_WORKING = i18n.translate(`${PREFIX}.threadSummaryWorking`, {
  defaultMessage: 'The agent is summarizing the thread',
});

/* ------------------------------ Team discussion ------------------------------ */

export const NO_AGENTS_ENABLED = i18n.translate(`${PREFIX}.noAgentsEnabled`, {
  defaultMessage: 'Agents are not enabled for this investigation. Your team discusses it here.',
});
export const AGENT_BUILDER_UNAVAILABLE = (reason: string) =>
  i18n.translate(`${PREFIX}.agentBuilderUnavailable`, {
    defaultMessage: 'Agent Builder is not available to you: {reason}',
    values: { reason },
  });
export const REASON_NO_ACCESS = i18n.translate(`${PREFIX}.reasonNoAccess`, {
  defaultMessage: 'you need an Enterprise licence and access to Agent Builder.',
});
export const REASON_NO_CONVERSATION = i18n.translate(`${PREFIX}.reasonNoConversation`, {
  defaultMessage: 'this investigation has no agent conversation yet.',
});
export const TEAM_DISCUSSION = i18n.translate(`${PREFIX}.teamDiscussion`, {
  defaultMessage: 'Team discussion',
});
export const TEAM_DISCUSSION_LOADING = i18n.translate(`${PREFIX}.teamDiscussionLoading`, {
  defaultMessage: 'Loading the team discussion',
});
export const TEAM_DISCUSSION_ERROR = i18n.translate(`${PREFIX}.teamDiscussionError`, {
  defaultMessage: 'Could not load the team discussion',
});
export const TEAM_EMPTY_TITLE = i18n.translate(`${PREFIX}.teamEmptyTitle`, {
  defaultMessage: 'No messages yet',
});
export const TEAM_EMPTY_BODY = i18n.translate(`${PREFIX}.teamEmptyBody`, {
  defaultMessage: 'Start the discussion below. Mention a teammate with @.',
});
export const TEAM_MESSAGE_COUNT = (count: number) =>
  i18n.translate(`${PREFIX}.teamMessageCount`, {
    defaultMessage: '{count, plural, one {# message} other {# messages}}',
    values: { count },
  });
export const REPLIES = (count: number) =>
  i18n.translate(`${PREFIX}.replies`, {
    defaultMessage: '{count, plural, one {# reply} other {# replies}}',
    values: { count },
  });
export const REPLY = i18n.translate(`${PREFIX}.reply`, { defaultMessage: 'Reply' });
export const REPLY_IN_THREAD = i18n.translate(`${PREFIX}.replyInThread`, {
  defaultMessage: 'Reply in thread',
});
export const REPLY_PLACEHOLDER = i18n.translate(`${PREFIX}.replyPlaceholder`, {
  defaultMessage: 'Write a reply',
});
export const WRITE_MESSAGE = i18n.translate(`${PREFIX}.writeMessage`, {
  defaultMessage: 'Write a message to your team',
});
export const COMPOSER_PLACEHOLDER = i18n.translate(`${PREFIX}.composerPlaceholder`, {
  defaultMessage: 'Write a message. Use @ to mention a teammate.',
});
export const SEND = i18n.translate(`${PREFIX}.send`, { defaultMessage: 'Send' });
export const SEND_ARIA = i18n.translate(`${PREFIX}.sendAria`, { defaultMessage: 'Send message' });
export const MENTION = i18n.translate(`${PREFIX}.mention`, {
  defaultMessage: 'Mention a teammate',
});
export const MENTION_SEARCH = i18n.translate(`${PREFIX}.mentionSearch`, {
  defaultMessage: 'Find a teammate',
});
export const MENTION_EMPTY = i18n.translate(`${PREFIX}.mentionEmpty`, {
  defaultMessage: 'No teammates found.',
});
export const PIN_AS_CLAIM = i18n.translate(`${PREFIX}.pinAsClaim`, {
  defaultMessage: 'Pin as claim',
});
export const PIN_AS_CLAIM_ARIA = i18n.translate(`${PREFIX}.pinAsClaimAria`, {
  defaultMessage: 'Pin this message as a claim',
});
export const PINNED = (ref: string) =>
  i18n.translate(`${PREFIX}.pinned`, {
    defaultMessage: 'Pinned as {ref}',
    values: { ref },
  });
export const COPY_MESSAGE = i18n.translate(`${PREFIX}.copyMessage`, {
  defaultMessage: 'Copy message',
});
export const COPIED = i18n.translate(`${PREFIX}.copied`, { defaultMessage: 'Copied.' });
export const SHOWING_LATEST = (shown: number, total: number) =>
  i18n.translate(`${PREFIX}.showingLatest`, {
    defaultMessage: 'Showing the first {shown} of {total} messages.',
    values: { shown, total },
  });
