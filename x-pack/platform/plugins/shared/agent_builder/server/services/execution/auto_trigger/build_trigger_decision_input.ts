/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineEvent } from '@kbn/agent-builder-common';
import {
  getEventActorDisplayName,
  isExecutionTerminatedEvent,
  isUserMessageEvent,
} from '@kbn/agent-builder-common';
import type { DecisionPredicateQuestion } from '@kbn/inference-common';

export const shouldRespondQuestion: DecisionPredicateQuestion = {
  type: 'predicate',
  instructions:
    "This is a shared conversation between people and an AI agent, described on the first line of the input. Decide whether the AI agent should respond to the new message. Answer true when the message @mentions the agent: it replies when addressed directly, even if only to say it can't help, unless the message tells it not to reply. Also answer true when the message asks for something the agent can help with according to its description, even without mentioning it. Answer false when the message is directed at other people, is a reaction or acknowledgement, or asks for something outside what the agent does without addressing it.",
};

const DEFAULT_AUTHOR = 'User';
const ATTACHMENTS_ONLY = '(attachments only)';

interface HistoryMessage {
  author: string;
  text: string;
}

const truncate = (text: string, maxChars: number): string =>
  text.length > maxChars ? `${text.slice(0, maxChars)}…` : text;

const toHistoryMessage = (event: TimelineEvent, agentName: string): HistoryMessage | undefined => {
  if (isUserMessageEvent(event)) {
    return {
      author: getEventActorDisplayName(event.actor) ?? DEFAULT_AUTHOR,
      text: event.data.message.trim() || ATTACHMENTS_ONLY,
    };
  }

  if (isExecutionTerminatedEvent(event) && event.data.outcome.type === 'responded') {
    return { author: agentName, text: event.data.outcome.response.message };
  }

  return undefined;
};

/**
 * Builds the text a decision model reads to decide whether the agent should respond to a new
 * message: the agent, the participants, the recent messages and the new message.
 */
export const buildTriggerDecisionInput = ({
  events,
  agent,
  message,
  maxMessages = 10,
  maxMessageChars = 2000,
}: {
  events: TimelineEvent[];
  agent: { name: string; description?: string };
  message: { text?: string; hasAttachments: boolean; authorName?: string };
  maxMessages?: number;
  maxMessageChars?: number;
}): string => {
  const history = events
    .map((event) => toHistoryMessage(event, agent.name))
    .filter((entry): entry is HistoryMessage => entry !== undefined)
    .slice(-maxMessages);

  const author = message.authorName ?? DEFAULT_AUTHOR;
  const participants = [...new Set([...history.map((entry) => entry.author), author])];
  const text = message.text?.trim() || (message.hasAttachments ? ATTACHMENTS_ONLY : '');

  return [
    agent.description ? `Agent: ${agent.name} - ${agent.description}` : `Agent: ${agent.name}`,
    `Participants: ${participants.join(', ')}`,
    'Recent messages:',
    ...history.map((entry) => `[${entry.author}]: ${truncate(entry.text, maxMessageChars)}`),
    `New message from ${author}:`,
    truncate(text, maxMessageChars),
  ].join('\n');
};
