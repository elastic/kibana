/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Characters kept of one text part, such as a user message or an answer. */
export const MAX_TEXT_PART_CHARS = 16_000;
/** Characters kept of the arguments of one tool call. */
export const MAX_TOOL_ARGUMENTS_CHARS = 2000;
/** Characters kept of one tool result, such as a page an agent opened or the rows a query returned. */
export const MAX_TOOL_RESULT_CHARS = 16_000;
/** Characters kept of a whole round, about 400k tokens; a longer round keeps its start and end. */
export const MAX_ROUND_CHARS = 1_600_000;

const ELLIPSIS = ' […]';

interface MessagePart {
  type: string;
  [key: string]: unknown;
}

interface Message {
  role: string;
  parts: MessagePart[];
}

/** The spans of one round that a transcript is built from. */
export interface RoundSpans {
  /** The last `chat` span of the round: its input is the conversation so far, its output the answer. */
  lastChat?: { inputMessages?: unknown; outputMessages?: unknown };
}

const truncate = (text: string, max: number): string =>
  text.length > max ? `${text.slice(0, max)}${ELLIPSIS}` : text;

const asText = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (value === undefined || value === null) {
    return '';
  }
  return JSON.stringify(value);
};

/** Parses `gen_ai.input.messages` or `gen_ai.output.messages`: a JSON array of messages. */
export const parseMessages = (value: unknown): Message[] => {
  let parsed: unknown = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.flatMap((message): Message[] => {
    if (!message || typeof message !== 'object') {
      return [];
    }
    const { role, parts } = message as { role?: unknown; parts?: unknown };
    if (typeof role !== 'string' || !Array.isArray(parts)) {
      return [];
    }
    return [
      {
        role,
        parts: parts.filter(
          (part): part is MessagePart => !!part && typeof part === 'object' && 'type' in part
        ),
      },
    ];
  });
};

const SENDER_HEADER = /^\[User: [^\]\n]*\]\s*/;

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

const unwrapToolResult = (response: unknown): string => {
  let text = asText(response);
  const parsed = parseJson(text);
  if (
    parsed &&
    typeof parsed === 'object' &&
    typeof (parsed as { response?: unknown }).response === 'string'
  ) {
    text = (parsed as { response: string }).response;
  }
  return text.replace(/^\s*<tool_result>/, '').replace(/<\/tool_result>\s*$/, '');
};

const textOf = ({ role, parts }: Message): string =>
  parts
    .filter((part) => part.type === 'text')
    .map((part) => {
      const text = asText(part.content).trim();
      return role === 'user' ? text.replace(SENDER_HEADER, '') : text;
    })
    .filter(Boolean)
    .join('\n');

const isUserTurn = (message: Message): boolean =>
  message.role === 'user' && textOf(message).length > 0;

const isSentByUser = ({ role, parts }: Message): boolean =>
  role === 'user' &&
  parts.some((part) => part.type === 'text' && SENDER_HEADER.test(asText(part.content).trim()));

const renderMessage = (message: Message, onlySentUserMessages: boolean): string[] => {
  const lines: string[] = [];
  const text = textOf(message);
  if (message.role === 'user' && text && (!onlySentUserMessages || isSentByUser(message))) {
    lines.push(`User: ${truncate(text, MAX_TEXT_PART_CHARS)}`);
  }
  if (message.role === 'assistant') {
    if (text) {
      lines.push(`Assistant: ${truncate(text, MAX_TEXT_PART_CHARS)}`);
    }
    for (const part of message.parts) {
      if (part.type === 'tool_call') {
        lines.push(
          `Assistant called ${asText(part.name) || 'a tool'}: ${truncate(
            asText(part.arguments),
            MAX_TOOL_ARGUMENTS_CHARS
          )}`
        );
      }
    }
  }
  for (const part of message.parts) {
    if (part.type === 'tool_call_response') {
      lines.push(
        `Tool result: ${truncate(unwrapToolResult(part.response), MAX_TOOL_RESULT_CHARS)}`
      );
    }
  }
  return lines;
};

const capRound = (text: string): string => {
  if (text.length <= MAX_ROUND_CHARS) {
    return text;
  }
  const head = Math.floor(MAX_ROUND_CHARS / 3);
  const tail = MAX_ROUND_CHARS - head;
  return `${text.slice(0, head)}\n[…]\n${text.slice(text.length - tail)}`;
};

const lastIndexOf = (messages: Message[], matches: (message: Message) => boolean): number => {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (matches(messages[i])) {
      return i;
    }
  }
  return -1;
};

/**
 * Builds the transcript of one round from its last `chat` span, starting at the last user message.
 * Returns undefined when the spans hold no conversation text.
 */
export const buildRoundTranscript = ({ lastChat }: RoundSpans): string | undefined => {
  if (!lastChat) {
    return undefined;
  }
  const input = parseMessages(lastChat.inputMessages);
  const output = parseMessages(lastChat.outputMessages);

  const sent = lastIndexOf(input, isSentByUser);
  const start = sent !== -1 ? sent : lastIndexOf(input, isUserTurn);
  const roundInput = start === -1 ? [] : input.slice(start);

  const lines = [...roundInput, ...output].flatMap((message) =>
    renderMessage(message, sent !== -1)
  );
  const spoken = [...roundInput, ...output].some(
    (message) =>
      (message.role === 'user' || message.role === 'assistant') && textOf(message).length > 0
  );
  if (!spoken || lines.length === 0) {
    return undefined;
  }
  return capRound(lines.join('\n'));
};
