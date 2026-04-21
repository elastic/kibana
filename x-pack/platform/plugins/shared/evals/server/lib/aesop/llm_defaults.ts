/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Default `max_tokens` for raw `subAction: 'run'` connector calls.
 *
 * The Bedrock / Anthropic connector's `run` subAction forwards the body
 * unchanged; Claude-on-Bedrock rejects requests without a positive
 * `max_tokens` with HTTP 400 (`"'max_tokens' must be positive"`).
 *
 * 32000 is the output ceiling for Claude Opus 4 / 4.1 on Bedrock and is
 * safely below the Sonnet 4.x / Haiku 4.5 ceiling of 64000, so this one
 * value works for every `.bedrock` connector we've seen on the cluster.
 * It gives AESOP's improvement prompts (full rewritten skill markdown)
 * room to stretch without truncation, while still fitting validation
 * scorecards (which finish in a few hundred tokens anyway).
 */
export const AESOP_LLM_MAX_TOKENS = 32000;

export interface LlmChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface BuildLlmRequestBodyInput {
  messages: LlmChatMessage[];
  /** Optional top-level system prompt; merged with any `role: 'system'` entries in `messages`. */
  system?: string;
  temperature?: number;
  maxTokens?: number;
  /** Kibana connector type id (e.g. `.bedrock`, `.gen-ai`, `.gemini`). */
  connectorTypeId?: string;
}

/** Anthropic-on-Bedrock's required `anthropic_version` value. */
const BEDROCK_ANTHROPIC_VERSION = 'bedrock-2023-05-31';

/**
 * Build a chat-completion request body for the `subAction: 'run'` passthrough.
 *
 * The `run` subAction forwards the body unchanged, so the caller is
 * responsible for producing a shape the target provider accepts. The three
 * providers we care about disagree in exactly one way each:
 *
 *   - Bedrock/Anthropic needs `system` at the top level (not as a
 *     `role: 'system'` message), a positive `max_tokens`, and
 *     `anthropic_version: 'bedrock-2023-05-31'`.
 *   - OpenAI (`.gen-ai`) accepts `role: 'system'` inside `messages` and
 *     silently ignores unknown top-level fields.
 *   - Gemini (`.gemini`) uses its own shape; the `run` subAction is not used
 *     from AESOP today, but we still split `system` out defensively.
 *
 * Passing `system` at the top level + stripping `role: 'system'` messages +
 * a positive `max_tokens` works everywhere. `anthropic_version` is only
 * added when the connector type is `.bedrock` to avoid polluting other
 * providers' request bodies.
 */
export function buildLlmRequestBody({
  messages,
  system,
  temperature,
  maxTokens = AESOP_LLM_MAX_TOKENS,
  connectorTypeId,
}: BuildLlmRequestBodyInput): Record<string, unknown> {
  const systemParts: string[] = [];
  if (system) systemParts.push(system);
  const nonSystemMessages = messages.filter((m) => {
    if (m.role === 'system') {
      systemParts.push(m.content);
      return false;
    }
    return true;
  });

  const body: Record<string, unknown> = {
    messages: nonSystemMessages,
    max_tokens: maxTokens,
  };
  if (systemParts.length) body.system = systemParts.join('\n\n');
  // Claude 4+ on Bedrock rejects `temperature` outright ("`temperature` is deprecated for this model").
  // Older Anthropic models accept it but the provider default is acceptable for AESOP's prompts,
  // so we drop it for `.bedrock` to keep a single portable code path.
  if (temperature !== undefined && connectorTypeId !== '.bedrock') {
    body.temperature = temperature;
  }
  if (connectorTypeId === '.bedrock') body.anthropic_version = BEDROCK_ANTHROPIC_VERSION;
  return body;
}

/**
 * Lookup the connector type id for a connector; returns `undefined` on
 * failure so callers can still build a best-effort body.
 */
/**
 * Normalize the `data` payload returned by a Kibana actions connector into the raw
 * assistant text, across the three provider shapes we care about (OpenAI chat
 * completions, Bedrock Anthropic Messages, Gemini GenerateContent). Falls back to
 * a JSON dump so debugging never gets a silent empty string.
 */
export function extractLlmResponseText(data: unknown): string {
  if (typeof data === 'string') return data;
  if (data === null || typeof data !== 'object') return JSON.stringify(data);
  const d = data as Record<string, unknown>;

  // Some Kibana connectors wrap the provider response under `.message` (Bedrock `run` subaction).
  if (typeof d.message === 'string') return d.message;

  // OpenAI / .gen-ai chat completions
  const choices = d.choices;
  if (Array.isArray(choices) && choices[0] && typeof choices[0] === 'object') {
    const first = choices[0] as Record<string, unknown>;
    const message = first.message as Record<string, unknown> | undefined;
    if (typeof message?.content === 'string') return message.content;
  }

  // Bedrock Anthropic Messages API
  if (typeof d.completion === 'string') return d.completion;
  const content = d.content;
  if (Array.isArray(content) && content[0] && typeof content[0] === 'object') {
    const first = content[0] as Record<string, unknown>;
    if (typeof first.text === 'string') return first.text;
  }

  // Gemini GenerateContent
  const candidates = d.candidates;
  if (Array.isArray(candidates) && candidates[0] && typeof candidates[0] === 'object') {
    const cand = candidates[0] as Record<string, unknown>;
    const candContent = cand.content as Record<string, unknown> | undefined;
    const parts = candContent?.parts;
    if (Array.isArray(parts) && parts[0] && typeof parts[0] === 'object') {
      const firstPart = parts[0] as Record<string, unknown>;
      if (typeof firstPart.text === 'string') return firstPart.text;
    }
  }

  return JSON.stringify(data);
}

export async function getConnectorTypeId(
  actionsClient: { get: (args: { id: string }) => Promise<{ actionTypeId?: string }> },
  connectorId: string
): Promise<string | undefined> {
  try {
    const info = await actionsClient.get({ id: connectorId });
    return info.actionTypeId;
  } catch {
    return undefined;
  }
}
