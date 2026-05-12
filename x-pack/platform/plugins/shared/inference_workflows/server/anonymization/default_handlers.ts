/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HookHandler } from '@kbn/workflows/server/types';
import {
  ANONYMIZATION_CONTEXT_CAPABILITY_KEY,
  type AnonymizationContextHandle,
} from './context_handle';
import { DEFAULT_RULES, type RegexRule } from './default_rules';
import { generateToken, TOKEN_RESTORE_REGEX } from './generate_token';

const anonymizeString = (
  text: string,
  rules: readonly RegexRule[],
  ctx: AnonymizationContextHandle
): string => {
  let result = text;
  for (const rule of rules) {
    let regex: RegExp | undefined;
    try {
      regex = new RegExp(rule.pattern, 'g');
    } catch {
      // skip rules with invalid regex patterns
    }
    if (regex) {
      result = result.replace(regex, (matched) => {
        const token = generateToken(ctx.salt, rule.entityClass, matched);
        ctx.tokenMap.set(token, { original: matched, entityClass: rule.entityClass });
        return token;
      });
    }
  }
  return result;
};

const restoreString = (text: string, ctx: AnonymizationContextHandle): string =>
  text.replace(TOKEN_RESTORE_REGEX, (fullMatch) => {
    const entry = ctx.tokenMap.get(fullMatch);
    return entry ? entry.original : fullMatch;
  });

/**
 * Recursively restore tokens in any value. Counterpart to `anonymizeValue`.
 * Mirrors `deanonymizeStructure` from the inference plugin
 * (x-pack/.../anonymization/deanonymize.ts:22-44): walks arrays and objects,
 * applying `restoreString` to every string leaf. Tokens with no map entry are
 * left untouched (lookup-or-leave), matching `restoreString`'s semantics.
 */
const restoreValue = (value: unknown, ctx: AnonymizationContextHandle): unknown => {
  if (typeof value === 'string') return restoreString(value, ctx);
  if (Array.isArray(value)) return value.map((item) => restoreValue(item, ctx));
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, restoreValue(v, ctx)])
    );
  }
  return value;
};

const anonymizeValue = (
  value: unknown,
  rules: readonly RegexRule[],
  ctx: AnonymizationContextHandle
): unknown => {
  if (typeof value === 'string') return anonymizeString(value, rules, ctx);
  if (Array.isArray(value)) return value.map((item) => anonymizeValue(item, rules, ctx));
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        anonymizeValue(v, rules, ctx),
      ])
    );
  }
  return value;
};

const anonymizeMessageContent = (
  message: unknown,
  rules: readonly RegexRule[],
  ctx: AnonymizationContextHandle
): unknown => {
  if (!message || typeof message !== 'object') return message;
  const msg = message as Record<string, unknown>;

  let result = msg;

  const { content } = msg;
  if (typeof content === 'string') {
    result = { ...result, content: anonymizeString(content, rules, ctx) };
  } else if (Array.isArray(content)) {
    result = {
      ...result,
      content: content.map((part) => {
        if (
          part &&
          typeof part === 'object' &&
          typeof (part as Record<string, unknown>).text === 'string'
        ) {
          return {
            ...part,
            text: anonymizeString((part as Record<string, unknown>).text as string, rules, ctx),
          };
        }
        return part;
      }),
    };
  }

  if (Array.isArray(msg.toolCalls)) {
    result = {
      ...result,
      toolCalls: msg.toolCalls.map((tc) => {
        if (!tc || typeof tc !== 'object') return tc;
        const toolCall = tc as Record<string, unknown>;
        const fn = toolCall.function;
        if (!fn || typeof fn !== 'object') return tc;
        const fnObj = fn as Record<string, unknown>;
        return {
          ...toolCall,
          function: { ...fnObj, arguments: anonymizeValue(fnObj.arguments, rules, ctx) },
        };
      }),
    };
  }

  if ('response' in msg) {
    result = { ...result, response: anonymizeValue(msg.response, rules, ctx) };
  }

  return result;
};

/**
 * Default hook handler for `inference.beforeCompletion`.
 * Applies PII detection using built-in regex rules (IP, EMAIL, HOST_NAME) uniformly
 * to the system prompt and all messages. Tokens are deterministic within a session
 * (HMAC-keyed by sessionId), so the LLM receives consistent tokens across turns and
 * across all fields (system, user content, tool results, tool call arguments).
 *
 * Tool call arguments are de-anonymized in `defaultAfterCompletionHandler`
 * before they leave the LLM hop, so downstream tools always receive real values
 * regardless of how aggressively a regex rule (built-in or custom) matched.
 *
 * Reads salt from the AnonymizationContext capability; writes tokens to its tokenMap.
 * Neither the salt nor the tokenMap appears in the YAML event payload.
 */
export const defaultBeforeCompletionHandler: HookHandler = async (payload, capabilities) => {
  const ctx = capabilities?.[ANONYMIZATION_CONTEXT_CAPABILITY_KEY] as
    | AnonymizationContextHandle
    | undefined;
  if (!ctx) {
    return payload;
  }

  const rules = DEFAULT_RULES;
  const { messages, system } = payload;

  const anonymizedMessages = Array.isArray(messages)
    ? messages.map((msg) => anonymizeMessageContent(msg, rules, ctx))
    : messages;

  const anonymizedSystem =
    typeof system === 'string' ? anonymizeString(system, rules, ctx) : system;

  return { ...payload, messages: anonymizedMessages, system: anonymizedSystem };
};

/**
 * Default hook handler for `inference.afterCompletion`.
 *
 * Restores PII tokens on the *outbound* leg of the LLM call. Mirrors the
 * inference plugin's `deanonymizeMessage` pipeline
 * (x-pack/.../anonymization/deanonymize_message.ts:60-144):
 *
 *   - `response`: recursively restored whether it's a string or a structured
 *     value. Counterpart to `anonymizeValue` on the inbound side.
 *   - `toolCalls[*].function.arguments`: recursively restored so tools always
 *     receive original values. This is the safety net that makes the system
 *     robust to over-broad regex rules — built-in or `custom_patterns`.
 *
 * Reads the tokenMap from the AnonymizationContext capability. Tokens with no
 * map entry are left untouched (the regex/lookup is the source of truth;
 * silent stripping would corrupt content). The capability is never surfaced
 * in the YAML event payload.
 */
export const defaultAfterCompletionHandler: HookHandler = async (payload, capabilities) => {
  const ctx = capabilities?.[ANONYMIZATION_CONTEXT_CAPABILITY_KEY] as
    | AnonymizationContextHandle
    | undefined;
  if (!ctx) {
    return payload;
  }

  let result: Record<string, unknown> = payload;

  if ('response' in result) {
    result = { ...result, response: restoreValue(result.response, ctx) };
  }

  const toolCalls = (result as { toolCalls?: unknown }).toolCalls;
  if (Array.isArray(toolCalls)) {
    result = {
      ...result,
      toolCalls: toolCalls.map((tc) => {
        if (!tc || typeof tc !== 'object') return tc;
        const toolCall = tc as Record<string, unknown>;
        const fn = toolCall.function;
        if (!fn || typeof fn !== 'object') return toolCall;
        const fnObj = fn as Record<string, unknown>;
        return {
          ...toolCall,
          function: { ...fnObj, arguments: restoreValue(fnObj.arguments, ctx) },
        };
      }),
    };
  }

  return result;
};
