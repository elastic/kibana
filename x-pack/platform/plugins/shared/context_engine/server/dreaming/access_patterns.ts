/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AccessPattern } from '../../common/step_types/apply_dream_changes';
import {
  createKiVerifierRegistry,
  ESQL_ATTRIBUTE_KEY,
  ESQL_VALID_RUNTIME_VERIFIER_ID,
  ESQL_VALID_SYNTAX_VERIFIER_ID,
  KiVerificationService,
  type KiVerifierContext,
} from '../ki_verification';
import type { DreamedKi, DreamedKiAttributes } from './dreamed_ki';
import type { DreamingOperation } from './resolve_change_set';

/** Holds each pattern as JSON, so a later run can show the model what the KI already carries. */
export const ACCESS_PATTERNS_ATTRIBUTE = 'access_patterns';

const SECTION_HEADING = '## Access patterns';

/** Content without its rendered access patterns section. */
export const baseContent = (content: string | undefined): string | undefined => {
  if (content === undefined) {
    return undefined;
  }
  if (content.startsWith(`${SECTION_HEADING}\n`)) {
    return '';
  }
  const index = content.indexOf(`\n\n${SECTION_HEADING}\n`);
  return index === -1 ? content : content.slice(0, index);
};

const renderPattern = ({
  question_type: label,
  esql_template: template,
  esql_example: example,
  returns,
}: AccessPattern) =>
  [`- [${label}] ${returns}`, `  Template: \`${template}\``, `  Example: \`${example}\``].join(
    '\n'
  );

/** Content with the access patterns appended, the way the automation templates render them. */
export const renderContent = (
  base: string | undefined,
  patterns: readonly AccessPattern[]
): string | undefined => {
  if (patterns.length === 0) {
    return base;
  }
  const section = [SECTION_HEADING, ...patterns.map(renderPattern)].join('\n');
  return base ? `${base}\n\n${section}` : section;
};

const isAccessPattern = (value: unknown): value is AccessPattern => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const fields = value as Record<string, unknown>;
  return ['question_type', 'esql_template', 'esql_example', 'returns'].every(
    (key) => typeof fields[key] === 'string'
  );
};

export const accessPatternsOf = (ki: DreamedKi | undefined): AccessPattern[] => {
  const stored = ki?.attributes?.[ACCESS_PATTERNS_ATTRIBUTE];
  const entries = Array.isArray(stored) ? stored : [];
  return entries.flatMap((entry) => {
    try {
      const parsed: unknown = JSON.parse(String(entry));
      return isAccessPattern(parsed) ? [parsed] : [];
    } catch {
      return [];
    }
  });
};

/** The attributes that carry the patterns: every example under `esql`, which verifiers check. */
export const accessPatternAttributes = (patterns: readonly AccessPattern[]): DreamedKiAttributes =>
  patterns.length > 0
    ? {
        [ACCESS_PATTERNS_ATTRIBUTE]: patterns.map((pattern) => JSON.stringify(pattern)),
        [ESQL_ATTRIBUTE_KEY]: patterns.map(({ esql_example: example }) => example),
      }
    : {};

/** Attributes without the ones that carry access patterns, so new patterns replace them. */
export const withoutAccessPatternAttributes = (
  attributes: DreamedKiAttributes | undefined
): DreamedKiAttributes =>
  Object.fromEntries(
    Object.entries(attributes ?? {}).filter(
      ([key]) => key !== ACCESS_PATTERNS_ATTRIBUTE && key !== ESQL_ATTRIBUTE_KEY
    )
  );

/** Whether an ES|QL query parses and runs. */
export type VerifyEsql = (query: string) => Promise<boolean>;

const verification = new KiVerificationService(createKiVerifierRegistry());

export const createVerifyEsql =
  (context: KiVerifierContext): VerifyEsql =>
  async (query) =>
    (
      await verification.verifyKi(
        { attributes: { [ESQL_ATTRIBUTE_KEY]: [query] } },
        {
          ...context,
          isEnabled: true,
          verifiers: [ESQL_VALID_SYNTAX_VERIFIER_ID, ESQL_VALID_RUNTIME_VERIFIER_ID],
        }
      )
    ).passed;

/**
 * Drops access patterns whose example does not run. An item whose new patterns all fail keeps
 * the ones it has, rather than losing verified patterns to broken replacements.
 */
export const keepVerifiedPatterns = async (
  operations: readonly DreamingOperation[],
  verifyEsql: VerifyEsql
): Promise<{ operations: DreamingOperation[]; dropped: number }> => {
  let dropped = 0;
  const verified: DreamingOperation[] = [];
  for (const operation of operations) {
    if (
      (operation.op !== 'upsert_entity' && operation.op !== 'upsert_fact') ||
      !operation.accessPatterns?.length
    ) {
      verified.push(operation);
      continue;
    }
    const { accessPatterns, ...rest } = operation;
    const passed = await Promise.all(
      accessPatterns.map(({ esql_example: example }) => verifyEsql(example))
    );
    const kept = accessPatterns.filter((_, index) => passed[index]);
    dropped += accessPatterns.length - kept.length;
    verified.push(kept.length > 0 ? { ...rest, accessPatterns: kept } : rest);
  }
  return { operations: verified, dropped };
};
