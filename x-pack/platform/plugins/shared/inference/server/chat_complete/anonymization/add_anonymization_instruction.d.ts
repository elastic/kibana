import type { AnonymizationRule } from '@kbn/inference-common';
import type { EffectivePolicy } from '@kbn/anonymization-common';
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
export declare function addAnonymizationInstruction(system: string, rules: AnonymizationRule[], effectivePolicy?: EffectivePolicy): string;
