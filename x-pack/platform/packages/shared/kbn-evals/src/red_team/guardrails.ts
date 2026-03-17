/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type GuardrailAction = 'block' | 'warn' | 'log';

export interface GuardrailRule {
  name: string;
  pattern: RegExp;
  action: GuardrailAction;
  description?: string;
}

export interface GuardrailMatch {
  ruleName: string;
  action: GuardrailAction;
  matchedText: string;
  description?: string;
}

export interface GuardrailCheckResult {
  blocked: boolean;
  matches: GuardrailMatch[];
}

const DEFAULT_GUARDRAIL_RULES: GuardrailRule[] = [
  {
    name: 'system-prompt-leak',
    pattern: /(?:system prompt|system instructions|your instructions are)/i,
    action: 'block',
    description: 'Detects output that references system prompt content.',
  },
  {
    name: 'credential-exposure',
    pattern: /(?:api[_-]?key|password|secret|token)\s*[:=]\s*\S+/i,
    action: 'block',
    description: 'Detects potential credential values in output.',
  },
  {
    name: 'internal-path-exposure',
    pattern: /(?:\/etc\/|\/var\/|\/home\/|C:\\|\/opt\/|\/usr\/)/i,
    action: 'warn',
    description: 'Detects references to internal filesystem paths.',
  },
  {
    name: 'dangerous-command',
    pattern: /(?:rm\s+-rf|DROP\s+TABLE|DELETE\s+FROM|FORMAT\s+C:|curl\s+.*\|\s*(?:ba)?sh)/i,
    action: 'block',
    description: 'Detects dangerous system or database commands.',
  },
  {
    name: 'private-ip-exposure',
    pattern: /(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})/,
    action: 'warn',
    description: 'Detects references to private/internal IP addresses.',
  },
  {
    name: 'role-assumption',
    pattern: /(?:I am now|acting as|switched to|elevated to)\s+(?:admin|superuser|root)/i,
    action: 'block',
    description: 'Detects the model claiming elevated privileges.',
  },
];

export const createGuardrailsEngine = (
  customRules?: GuardrailRule[]
): {
  check: (text: string) => GuardrailCheckResult;
  getRules: () => readonly GuardrailRule[];
} => {
  const rules = customRules ?? DEFAULT_GUARDRAIL_RULES;

  const check = (text: string): GuardrailCheckResult => {
    const matches: GuardrailMatch[] = [];

    for (const rule of rules) {
      rule.pattern.lastIndex = 0;
      const match = rule.pattern.exec(text);
      if (match) {
        matches.push({
          ruleName: rule.name,
          action: rule.action,
          matchedText: match[0],
          description: rule.description,
        });
      }
    }

    const blocked = matches.some((m) => m.action === 'block');

    return { blocked, matches };
  };

  return { check, getRules: () => rules };
};

export { DEFAULT_GUARDRAIL_RULES };
