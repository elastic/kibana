/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TokenEntry } from '../../../anonymization/context_handle';
import { generateToken } from '../../../anonymization/generate_token';
import type { RegexRule } from '../../../anonymization/default_rules';

/**
 * Anonymize PII in a text string using regex rules.
 * Returns the anonymized text and the token map entries produced.
 * The token map (keyed by token) is returned so callers can store it for deanonymization.
 *
 * Idempotent: calling with the same text + rules + salt produces the same tokens.
 */
export const anonymizeText = ({
  text,
  rules,
  salt,
}: {
  text: string;
  rules: RegexRule[];
  salt: string;
}): { anonymized: string; tokenMap: Map<string, TokenEntry> } => {
  const tokenMap = new Map<string, TokenEntry>();
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
        const token = generateToken(salt, rule.entityClass, matched);
        tokenMap.set(token, { original: matched, entityClass: rule.entityClass });
        return token;
      });
    }
  }

  return { anonymized: result, tokenMap };
};
