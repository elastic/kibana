/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { postMessage } from './slack_client';

// ---------------------------------------------------------------------------
// Notification service — sends a handoff notification back to the origin.
//
// origin_ref format: '<provider>:<channel>:<thread_ts>'
//   e.g. 'slack:C1234567890:1700000000.123456'
//
// Currently supports Slack. Additional providers (Teams, PagerDuty, etc.)
// can be added by extending the switch below.
// ---------------------------------------------------------------------------

export interface ConversationRound {
  input?: { message?: string };
  response?: { message?: string };
}

// Slack mrkdwn limits: keep each turn short enough that a few fit in one message.
const MAX_QUESTION_CHARS = 200;
const MAX_ANSWER_CHARS = 500;
const MAX_TURNS = 5;

const truncate = (s: string, max: number): string =>
  s.length > max ? s.slice(0, max - 1) + '…' : s;

export const sendHandoffNotification = async (
  botToken: string,
  {
    originRef,
    summary,
    rounds,
  }: {
    originRef: string;
    summary?: string;
    rounds?: ConversationRound[];
  }
): Promise<void> => {
  const colonIdx = originRef.indexOf(':');
  if (colonIdx === -1) return;

  const provider = originRef.slice(0, colonIdx);
  const rest = originRef.slice(colonIdx + 1);

  switch (provider) {
    case 'slack': {
      // rest = 'channelId:thread_ts'
      const secondColon = rest.indexOf(':');
      if (secondColon === -1) return;

      const channel = rest.slice(0, secondColon);
      const threadTs = rest.slice(secondColon + 1);

      const lines: string[] = ['✅ *Investigation complete*'];

      // Append the investigation Q&A — only rounds added after the fork.
      const investigationRounds = (rounds ?? []).filter(
        (r) =>
          r.input?.message && r.input.message !== '[Investigation complete]' && r.response?.message
      );

      if (investigationRounds.length > 0) {
        lines.push('', '─────────────────────', '*Investigation log*', '');
        const shown = investigationRounds.slice(-MAX_TURNS);
        const skipped = investigationRounds.length - shown.length;
        if (skipped > 0) {
          lines.push(`_… ${skipped} earlier exchange${skipped === 1 ? '' : 's'} omitted_`, '');
        }
        for (const round of shown) {
          lines.push(
            `:speech_balloon: *${truncate(round.input!.message!, MAX_QUESTION_CHARS)}*`,
            `> ${truncate(round.response!.message!, MAX_ANSWER_CHARS).replace(/\n/g, '\n> ')}`,
            ''
          );
        }
        lines.push('─────────────────────');
      }

      lines.push('', '_Reply here to continue the conversation._');

      await postMessage(botToken, {
        channel,
        thread_ts: threadTs,
        text: lines.join('\n'),
      });
      break;
    }
    default:
      // Unknown provider — no-op for now
      break;
  }
};
