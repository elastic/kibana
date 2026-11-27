/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationRecord } from '../../../../common/investigations/types';
import type { AgentConversation, ConversationUserRef } from './conversation_api';
import * as i18n from './translations';

export interface ConversationMessage {
  /** Stable id used as the claim's `source_message.message_id`. */
  id: string;
  /** 1-based position in the conversation, shown as "Message N". */
  index: number;
  role: 'user' | 'agent';
  authorName: string;
  ts: string;
  text: string;
  /** A message from a person that was sent with "Skip agent": no agent round answered it. */
  skippedAgent: boolean;
}

const DIGEST_PATTERN = /\s*<investigation_digest[\s\S]*?<\/investigation_digest>\s*/g;
const EXCERPT_LENGTH = 220;

/** The server appends an investigation digest to each user message before the model sees it. */
export const stripDigest = (text: string): string => text.replace(DIGEST_PATTERN, '\n').trim();

export const toExcerpt = (text: string, length: number = EXCERPT_LENGTH): string => {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > length ? `${flat.slice(0, length - 1).trimEnd()}…` : flat;
};

const resolveUserName = (
  user: ConversationUserRef | undefined,
  participants: InvestigationRecord['participants']
): string => {
  const username = user?.username;
  if (!username) {
    return i18n.AGENT_BADGE;
  }
  const participant = participants.find(({ id }) => id === username);
  return participant?.name || username;
};

interface TimedMessage extends Omit<ConversationMessage, 'index'> {
  order: number;
}

/**
 * Flattens an Agent Builder conversation into the messages people see: every user message
 * (including ones sent with "Skip agent", which are standalone `user_message` events) and every
 * agent response, in time order.
 */
export const buildMessages = (
  conversation: AgentConversation,
  record: Pick<InvestigationRecord, 'participants' | 'agent_name'>
): ConversationMessage[] => {
  const { participants, agent_name: agentName } = record;
  const agentLabel = agentName || i18n.AGENT_BADGE;
  const rounds = new Map(conversation.rounds.map((round) => [round.id, round]));
  const messages: TimedMessage[] = [];
  const emittedRounds = new Set<string>();

  const pushRound = (roundId: string) => {
    const round = rounds.get(roundId);
    if (!round || emittedRounds.has(roundId)) {
      return;
    }
    emittedRounds.add(roundId);
    const userText = stripDigest(round.input.message ?? '');
    if (userText.length > 0) {
      messages.push({
        id: `${roundId}::user_message`,
        role: 'user',
        authorName: resolveUserName(round.author, participants),
        ts: round.started_at,
        text: userText,
        skippedAgent: false,
        order: messages.length,
      });
    }
    const agentText = (round.response.message ?? '').trim();
    if (agentText.length > 0) {
      const finishedAt = new Date(
        Date.parse(round.started_at) + (round.time_to_last_token ?? 0)
      ).toISOString();
      messages.push({
        id: roundId,
        role: 'agent',
        authorName: agentLabel,
        ts: finishedAt,
        text: agentText,
        skippedAgent: false,
        order: messages.length,
      });
    }
  };

  (conversation.events ?? []).forEach((event) => {
    if (event.type !== 'user_message') {
      return;
    }
    const [roundId] = event.id.split('::');
    if (event.id.endsWith('::user_message') && rounds.has(roundId)) {
      pushRound(roundId);
      return;
    }
    const text = stripDigest(event.data?.message ?? '');
    if (text.length === 0) {
      return;
    }
    messages.push({
      id: event.id,
      role: 'user',
      authorName: resolveUserName(event.actor, participants),
      ts: event.created_at,
      text,
      skippedAgent: true,
      order: messages.length,
    });
  });

  // Rounds without a matching event (older conversations) still count.
  conversation.rounds.forEach((round) => pushRound(round.id));

  return messages
    .sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts) || a.order - b.order)
    .map((message, position) => ({
      id: message.id,
      index: position + 1,
      role: message.role,
      authorName: message.authorName,
      ts: message.ts,
      text: message.text,
      skippedAgent: message.skippedAgent,
    }));
};
