/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// ---------------------------------------------------------------------------
// Thin Slack Web API wrapper — raw fetch, no SDK dependency
// ---------------------------------------------------------------------------

const SLACK_API = 'https://slack.com/api';

async function slackCall(
  botToken: string,
  method: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; ts?: string; error?: string; needed?: string }> {
  const res = await fetch(`${SLACK_API}/${method}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${botToken}`,
    },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<{ ok: boolean; ts?: string; error?: string; needed?: string }>;
}

export const postMessage = async (
  botToken: string,
  { channel, thread_ts, text }: { channel: string; thread_ts?: string; text: string }
): Promise<string> => {
  const result = await slackCall(botToken, 'chat.postMessage', {
    channel,
    text,
    ...(thread_ts ? { thread_ts } : {}),
  });
  if (!result.ok)
    throw new Error(`Slack postMessage failed: ${result.error} (needed: ${result.needed})`);
  return result.ts ?? '';
};

export const updateMessage = async (
  botToken: string,
  { channel, ts, text }: { channel: string; ts: string; text: string }
): Promise<void> => {
  const result = await slackCall(botToken, 'chat.update', { channel, ts, text });
  if (!result.ok) throw new Error(`Slack updateMessage failed: ${result.error}`);
};

// ---------------------------------------------------------------------------
// Throttled stream updater — batches chat.update calls (~1 per 1.5s)
// ---------------------------------------------------------------------------

const STREAM_INTERVAL_MS = 1500;

export const createStreamUpdater = (
  botToken: string,
  channel: string,
  ts: string,
  threadTs: string,
  onError: (err: Error) => void,
  onFallback?: (err: Error) => void
) => {
  let lastUpdateMs = 0;
  let pendingText: string | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = (): void => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (!pendingText) return;
    lastUpdateMs = Date.now();
    const text = pendingText;
    pendingText = null;
    updateMessage(botToken, { channel, ts, text }).catch(onError);
  };

  return {
    schedule(text: string): void {
      pendingText = text;
      const elapsed = Date.now() - lastUpdateMs;
      if (elapsed >= STREAM_INTERVAL_MS) {
        flush();
      } else if (!timer) {
        timer = setTimeout(flush, STREAM_INTERVAL_MS - elapsed);
      }
    },

    async finalize(text: string): Promise<void> {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      try {
        await updateMessage(botToken, { channel, ts, text });
      } catch (updateErr) {
        // Message may have been deleted — fall back to a new reply in the thread
        onFallback?.(updateErr as Error);
        await postMessage(botToken, { channel, thread_ts: threadTs, text });
      }
    },
  };
};

// ---------------------------------------------------------------------------
// Message splitting — break at paragraph boundaries to avoid mid-sentence cuts
// ---------------------------------------------------------------------------

export const MAX_SLACK_MSG_LEN = 3900;

export const splitAtParagraph = (text: string, maxLen: number): string[] => {
  if (text.length <= maxLen) return [text];
  const parts: string[] = [];
  let rest = text;
  while (rest.length > maxLen) {
    const window = rest.slice(0, maxLen);
    const lastBreak = window.lastIndexOf('\n\n');
    const at = lastBreak > maxLen / 2 ? lastBreak : maxLen;
    parts.push(rest.slice(0, at).trimEnd());
    rest = rest.slice(at).trimStart();
  }
  if (rest) parts.push(rest);
  return parts;
};
