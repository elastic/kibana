/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnonymizationRule, RegexAnonymizationRule } from '@kbn/inference-common';
import dedent from 'dedent';

/**
 * Builds a human‑readable instruction that tells the LLM why hash‑like
 * placeholders (e.g. `PER_a1b2c3`) appear in the conversation and what
 * they mean.
 *
 * If no anonymization rules are enabled this returns an empty string.
 */
export function addAnonymizationInstruction(system: string, rules: AnonymizationRule[]): string {
  if (!rules.some((r) => r.enabled)) {
    return system;
  }

  const nerClasses = ['PER', 'LOC', 'ORG', 'MISC'];

  const regexClasses = rules
    .filter((r): r is RegexAnonymizationRule => r.type === 'RegExp' && r.enabled)
    .map((r) => r.entityClass);

  const exampleTokens = [...nerClasses, ...regexClasses].map((c) => `\`${c}_abc123\``).join(', ');

  return dedent(
    `${system}
    
    ### Anonymization
    
    Some entities in this conversation have been anonymized using placeholder tokens (e.g., ${exampleTokens}).
    These represent named entities such as people (PER), locations (LOC), organizations (ORG), and miscellaneous types (MISC)${
      regexClasses.length ? `, as well as custom types like ${regexClasses.join(', ')}.` : '.'
    }
    Do not attempt to infer their meaning, type, or real‑world identity. Refer to them exactly as they appear unless explicitly resolved or described.`
  );
}
