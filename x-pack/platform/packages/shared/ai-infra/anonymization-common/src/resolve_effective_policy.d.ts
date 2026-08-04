import type { FieldRule, EffectivePolicy } from './types';
/**
 * Resolves the effective anonymization policy from one or more sets of field rules.
 *
 * When multiple profiles contribute rules for the same field, conflicts are
 * resolved using "most restrictive wins":
 *
 * - **Deny** (`allowed=false`) wins over everything
 * - **Anonymize** (`allowed=true`, `anonymized=true`) wins over Allow
 * - **Allow** (`allowed=true`, `anonymized=false`)
 *
 * This is a pure function that can be used by both the anonymization plugin's
 * service layer and unit tests.
 *
 * @param fieldRuleSets - One or more arrays of field rules (from contributing profiles)
 * @returns The effective policy keyed by field name
 */
export declare const resolveEffectivePolicy: (...fieldRuleSets: FieldRule[][]) => EffectivePolicy;
