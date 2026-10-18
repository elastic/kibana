/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Tool-call recovery for chat models that speak the OpenAI "harmony" wire format
 * (gpt-oss and friends).
 *
 * Harmony tool calls travel in the `commentary` channel:
 *
 *   <|start|>assistant<|channel|>commentary to=functions.load_skill <|constrain|>json<|message|>{"skill":"foo"}<|call|>
 *
 * When the serving layer in front of the model does not parse that channel, the
 * whole message is returned as plain `content`, with the special tokens stripped
 * by the gateway:
 *
 *   ...assistantcommentary to=functions.load_skill json{"skill":"foo"}
 *
 * The call is then never executed: it is rendered to the user as the assistant's
 * answer and every downstream evaluator scores an output with no steps. The
 * functions below recognize both spellings so the call can be recovered and
 * executed instead of being lost.
 */

export interface HarmonyToolCall {
  name: string;
  /** raw JSON arguments, as written by the model */
  arguments: string;
  /** index of the first character of the recovered call in the scanned text */
  start: number;
  /** index right after the last character of the recovered call */
  end: number;
}

export type HarmonyToolCallScan =
  /** no call marker at all: the text can be emitted as content */
  | { type: 'none' }
  /** a call marker is present but the call is not complete yet (streaming) */
  | { type: 'pending' }
  | { type: 'call'; call: HarmonyToolCall };

/**
 * Longest prefix of a call that may still be split across chunks, so the tail of
 * a buffer shorter than this is never emitted as content early: the stripped
 * `assistantcommentary to=functions.` plus the `<|start|>`/`<|channel|>` markers
 * of the unstripped form.
 */
export const HARMONY_TOOL_CALL_HOLD = 64;

/** A call that never completes is flushed as content rather than buffered forever. */
export const MAX_HARMONY_TOOL_CALL_LENGTH = 64 * 1024;

const RECIPIENT_PREFIX = 'to=functions.';
const CHANNEL_SUFFIX = /(?:<\|start\|>)?assistant(?:<\|channel\|>)?commentary\s+$/;
const NAME = /^[A-Za-z0-9_.-]+/;
const CONSTRAIN_MARKER = '<|constrain|>';
const MESSAGE_MARKER = '<|message|>';
const CALL_END_MARKER = '<|call|>';
const MESSAGE_END_MARKER = '<|end|>';

const skipWhitespace = (text: string, from: number): number => {
  let index = from;
  while (index < text.length && /\s/.test(text[index])) {
    index++;
  }
  return index;
};

/**
 * End index (exclusive) of the JSON object that starts at `from`, or why it is
 * not usable yet. Brace/quote accounting is done by hand because arguments
 * routinely contain nested objects and braces inside strings.
 */
const scanJsonObject = (text: string, from: number): number | 'incomplete' | 'invalid' => {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = from; index < text.length; index++) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === '{') {
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth === 0) {
        return index + 1;
      }
    }
  }

  return inString || depth > 0 ? 'incomplete' : 'invalid';
};

const scanCallAt = (text: string, index: number): HarmonyToolCallScan => {
  const channel = text.slice(0, index).match(CHANNEL_SUFFIX);

  // `to=functions.x` in prose, without the commentary channel, is not a call.
  if (!channel) {
    return { type: 'none' };
  }

  const nameStart = index + RECIPIENT_PREFIX.length;
  const name = text.slice(nameStart).match(NAME)?.[0];

  if (!name) {
    // `to=functions.` with the name still streaming in.
    return { type: 'pending' };
  }

  let cursor = nameStart + name.length;
  if (cursor >= text.length) {
    return { type: 'pending' };
  }

  // The name is only complete once something delimits it (` `, `<|constrain|>`).
  if (!/[\s<]/.test(text[cursor])) {
    return { type: 'none' };
  }

  cursor = skipWhitespace(text, cursor);
  if (text.startsWith(CONSTRAIN_MARKER, cursor)) {
    cursor = skipWhitespace(text, cursor + CONSTRAIN_MARKER.length);
  }
  // The stripped form keeps the `json` type hint as bare text.
  if (text.startsWith('json', cursor)) {
    cursor = skipWhitespace(text, cursor + 'json'.length);
  }
  if (text.startsWith(MESSAGE_MARKER, cursor)) {
    cursor = skipWhitespace(text, cursor + MESSAGE_MARKER.length);
  }

  if (cursor >= text.length) {
    return { type: 'pending' };
  }

  if (text[cursor] !== '{') {
    return { type: 'none' };
  }

  const argumentsEnd = scanJsonObject(text, cursor);
  if (argumentsEnd === 'incomplete') {
    return { type: 'pending' };
  }
  if (argumentsEnd === 'invalid') {
    return { type: 'none' };
  }

  let end = argumentsEnd;
  if (text.startsWith(CALL_END_MARKER, end)) {
    end += CALL_END_MARKER.length;
  } else if (text.startsWith(MESSAGE_END_MARKER, end)) {
    end += MESSAGE_END_MARKER.length;
  }

  return {
    type: 'call',
    call: {
      name,
      arguments: text.slice(cursor, argumentsEnd),
      start: index - channel[0].length,
      end,
    },
  };
};

/**
 * Find the first harmony tool call in `text`, scanning from `from`.
 *
 * `start` covers the channel marker so callers can remove the whole call from the
 * assistant content, and `pending` means "buffer more chunks": a marker that is
 * genuinely not a call reports `none` and the text is emitted as content.
 */
export const findHarmonyToolCall = (text: string, from = 0): HarmonyToolCallScan => {
  let index = text.indexOf(RECIPIENT_PREFIX, from);

  while (index >= 0) {
    const scan = scanCallAt(text, index);
    if (scan.type !== 'none') {
      return scan;
    }
    index = text.indexOf(RECIPIENT_PREFIX, index + 1);
  }

  return { type: 'none' };
};
