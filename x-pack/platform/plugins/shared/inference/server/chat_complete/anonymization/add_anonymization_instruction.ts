/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnonymizationRule, RegexAnonymizationRule } from '@kbn/inference-common';
import type { EffectiveFieldPolicy, EffectivePolicy } from '@kbn/anonymization-common';
import dedent from 'dedent';

/**
 * Builds a human‑readable instruction that tells the LLM why hash‑like
 * placeholders (e.g. `PER_a1b2c3`) appear in the conversation and what
 * they mean.
 *
 * Covers all three anonymization paths:
 *  - NER rules → PER, LOC, ORG, MISC (filtered by allowedEntityClasses when present)
 *  - Regex rules → their entityClass values
 *  - Field-based policy → entity classes derived from the effective policy
 *
 * Returns the original system string unchanged when no anonymization is active.
 */
export function addAnonymizationInstruction(
  system: string,
  rules: AnonymizationRule[],
  effectivePolicy?: EffectivePolicy
): string {
  const hasEnabledRules = rules.some((r) => r.enabled);
  const hasFieldPolicy =
    effectivePolicy && Object.values(effectivePolicy).some((p) => p.action === 'anonymize');

  if (!hasEnabledRules && !hasFieldPolicy) {
    return system;
  }

  const hasNerRules = rules.some((r) => r.type === 'NER' && r.enabled);
  const nerClasses = hasNerRules ? ['PER', 'LOC', 'ORG', 'MISC'] : [];

  const regexClasses = rules
    .filter((r): r is RegexAnonymizationRule => r.type === 'RegExp' && r.enabled)
    .map((r) => r.entityClass);

  const fieldPolicyClasses = effectivePolicy
    ? [
        ...new Set(
          Object.values(effectivePolicy)
            .filter(
              (p): p is Extract<EffectiveFieldPolicy, { action: 'anonymize' }> =>
                p.action === 'anonymize'
            )
            .map((p) => p.entityClass)
        ),
      ]
    : [];

  const customClasses = [...new Set([...regexClasses, ...fieldPolicyClasses])];
  const allClasses = [...new Set([...nerClasses, ...customClasses])];
  const exampleTokens = allClasses.map((c) => `\`${c}_abc123\``).join(', ');

  return dedent(
    `${system}

    ### Anonymization

    Some entities in this conversation have been anonymized using placeholder tokens (e.g., ${exampleTokens}).
    These represent named entities such as people (PER), locations (LOC), organizations (ORG), and miscellaneous types (MISC)${
      customClasses.length ? `, as well as custom types like ${customClasses.join(', ')}.` : '.'
    }
    Do not attempt to infer their meaning, type, or real‑world identity. Refer to them exactly as they appear unless explicitly resolved or described.`
  );
}
