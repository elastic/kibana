/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvidenceRound } from './evidence/types';

// A BOM leading a part is an encoding artifact, not content, so it is dropped
// before the parts are joined (where it would no longer be leading).
const stripBom = (value: string): string => value.replace(/^\uFEFF/, '');

const parseJson = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

// Tool-call arguments are flattened to one `key: value` line per leaf instead
// of being JSON-stringified, so multi-line values keep real newlines (ES|QL
// fences, FROM clauses) and separate values never merge into one token.
const flattenArguments = (value: unknown, key: string | undefined, lines: string[]): void => {
  if (value == null) return;
  if (Array.isArray(value)) {
    for (const item of value) flattenArguments(item, key, lines);
    return;
  }
  if (typeof value === 'object') {
    for (const [childKey, child] of Object.entries(value)) {
      flattenArguments(child, key ? `${key}.${childKey}` : childKey, lines);
    }
    return;
  }
  const text = stripBom(String(value));
  lines.push(key ? `${key}: ${text}` : text);
};

/**
 * Text the agent itself wrote in a round: the final response plus tool-call
 * arguments. Tool results are excluded because they are data the agent merely
 * read, and the input message is excluded because it is the eval prompt.
 */
export const collectRoundText = (round: EvidenceRound): string => {
  const parts: string[] = [stripBom(round.response.message)];
  for (const step of round.steps) {
    const args =
      typeof step.arguments === 'string' ? parseJson(stripBom(step.arguments)) : step.arguments;
    flattenArguments(args, undefined, parts);
  }
  return parts.join('\n');
};
