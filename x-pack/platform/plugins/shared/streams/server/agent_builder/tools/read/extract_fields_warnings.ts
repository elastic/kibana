/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isActionBlock, isConditionBlock } from '@kbn/streamlang';
import type { StreamlangStep } from '@kbn/streamlang/types/streamlang';
import type { FieldChange } from './nl_to_streamlang';

/**
 * Step inspectors + post-fact warning builders for the `extract_fields: true`
 * flow. Pulled out of `extract_fields_handler.ts` so the warning prose lives
 * close to the helpers it depends on, and so future extraction tools can
 * reuse the same builders without dragging in the whole handler.
 *
 * Two responsibilities live here:
 *
 * 1. **Step inspectors** (`isExtractionStepOnField`, `stepWritesOrRemovesField`,
 *    `getStepWriteTargets`): low-level analyses over a `StreamlangStep` /
 *    sub-tree. Exhaustive over the full discriminated processor union — adding
 *    a new streamlang action without updating both switches is a compile
 *    error.
 * 2. **Warning builders** (`buildPlacementWarning`, `buildDuplicationWarning`,
 *    `buildOverwriteWarning`): build the user-facing strings the handler
 *    surfaces under `result.warnings[]`. Each returns `null` when no warning
 *    applies so the caller can `if` and skip without reshaping the array.
 */

/**
 * Detect whether an existing pipeline step already performs grok or dissect
 * extraction from the given source field. Used to warn the agent (and the
 * user) when running heuristic extraction would duplicate or conflict with
 * pre-existing parsing on the same field.
 *
 * Condition blocks recurse into their nested `steps` and `else` branches:
 * a duplicate extraction hidden inside `if log.level == error then grok…`
 * is still worth surfacing to the user. The downstream warning marks the
 * match as "inside a condition block" so the user can judge whether the
 * predicate scopes the duplication.
 */
export const isExtractionStepOnField = (step: unknown, fieldName: string): boolean => {
  if (typeof step !== 'object' || step === null) return false;
  if (isConditionBlock(step as StreamlangStep)) {
    const inner = (step as { condition: { steps?: unknown[]; else?: unknown[] } }).condition;
    return [...(inner.steps ?? []), ...(inner.else ?? [])].some((nested) =>
      isExtractionStepOnField(nested, fieldName)
    );
  }
  const obj = step as { action?: unknown; from?: unknown };
  return (obj.action === 'grok' || obj.action === 'dissect') && obj.from === fieldName;
};

/**
 * Detect whether an existing pipeline step could mutate or remove the seed
 * source field before the new extraction runs. Used by the merge step to
 * decide whether existing steps can keep their position (safe) or must be
 * pushed after the new extraction.
 *
 * Exhaustive over the full `StreamlangProcessorDefinition` discriminated
 * union — adding a new streamlang action without updating this switch is a
 * compile error (the `assertNever` branch). False negatives are unsafe
 * (they let an existing step clobber the seed source before extraction
 * reads it); false positives are merely suboptimal placement.
 *
 * Condition blocks recurse into their nested `steps` and `else` branches:
 * a `set body.text` hidden inside a `where` block must still force
 * defensive prepending.
 */
export const stepWritesOrRemovesField = (step: StreamlangStep, fieldName: string): boolean => {
  if (isConditionBlock(step)) {
    const inner = step.condition.steps ?? [];
    const elseInner = step.condition.else ?? [];
    return [...inner, ...elseInner].some((s) => stepWritesOrRemovesField(s, fieldName));
  }
  if (!isActionBlock(step)) return false;

  switch (step.action) {
    case 'set':
    case 'append':
    case 'math':
    case 'concat':
    case 'enrich':
    case 'join':
      return step.to === fieldName;
    case 'rename':
      return step.from === fieldName || step.to === fieldName;
    case 'remove':
      return step.from === fieldName;
    case 'remove_by_prefix':
      return fieldName === step.from || fieldName.startsWith(`${step.from}.`);
    case 'convert':
    case 'date':
    case 'uppercase':
    case 'lowercase':
    case 'trim':
    case 'sort':
    case 'split':
    case 'replace':
      return step.to === fieldName || (step.to == null && step.from === fieldName);
    case 'redact':
      return step.from === fieldName;
    case 'network_direction':
      return step.target_field === fieldName || step.target_field == null;
    case 'json_extract':
      return step.extractions.some((extraction) => extraction.target_field === fieldName);
    case 'grok': {
      const needle = `:${fieldName}}`;
      return step.patterns.some((pattern) => pattern.includes(needle));
    }
    case 'dissect':
      return step.pattern.includes(`%{${fieldName}}`);
    case 'drop_document':
      return false;
    case 'manual_ingest_pipeline':
      return true;
    default:
      return assertNever(step);
  }
};

/**
 * Enumerate the fields a step is known to write to. Used by the overwrite
 * warning to detect when an existing step's output would clobber a field
 * the new extraction is about to produce.
 *
 * Exhaustive over `StreamlangProcessorDefinition` — adding a new action
 * without updating this switch is a compile error. Returns `[]` for
 * read-only / doc-level / opaque actions: a missing target means "we don't
 * know what this writes, so we cannot specifically warn". The placement
 * decision still protects against silent clobbering of the seed source
 * (see {@link stepWritesOrRemovesField}).
 *
 * Condition blocks union their inner branches' write targets — a nested
 * `set my.field` should still surface in the overwrite warning.
 */
export const getStepWriteTargets = (step: StreamlangStep): string[] => {
  if (isConditionBlock(step)) {
    const inner = step.condition.steps ?? [];
    const elseInner = step.condition.else ?? [];
    return [...new Set([...inner, ...elseInner].flatMap(getStepWriteTargets))];
  }
  if (!isActionBlock(step)) return [];

  switch (step.action) {
    case 'set':
    case 'append':
    case 'math':
    case 'concat':
    case 'enrich':
    case 'join':
      return [step.to];
    case 'rename':
      return [step.to];
    case 'convert':
    case 'date':
    case 'uppercase':
    case 'lowercase':
    case 'trim':
    case 'sort':
    case 'split':
    case 'replace':
      return [step.to ?? step.from];
    case 'redact':
      return [step.from];
    case 'network_direction':
      return step.target_field ? [step.target_field] : [];
    case 'json_extract':
      return [...new Set(step.extractions.map((extraction) => extraction.target_field))];
    case 'grok': {
      const targets = new Set<string>();
      const re = /%\{[^:}]+:([^:}]+)(?::[^}]+)?\}/g;
      for (const pattern of step.patterns) {
        let match: RegExpExecArray | null;
        while ((match = re.exec(pattern)) !== null) targets.add(match[1]);
      }
      return [...targets];
    }
    case 'dissect': {
      const targets = new Set<string>();
      const re = /%\{([^?+&*}][^}]*)\}/g;
      let match: RegExpExecArray | null;
      while ((match = re.exec(step.pattern)) !== null) targets.add(match[1]);
      return [...targets];
    }
    case 'remove':
    case 'remove_by_prefix':
    case 'drop_document':
    case 'manual_ingest_pipeline':
      return [];
    default:
      return assertNever(step);
  }
};

/**
 * Compile-time exhaustiveness guard. The `default` branch of the switches
 * above must call this so adding a new streamlang processor type without
 * updating both helpers fails the type check.
 */
const assertNever = (step: never): never => {
  throw new Error(`Unhandled streamlang step: ${JSON.stringify(step)}`);
};

/**
 * Explain where the new extraction landed relative to the existing pipeline
 * so the user can judge whether the placement is safe to apply. Two
 * branches:
 *
 * - When an existing step writes to / removes the seed source field, the
 *   new extraction was prepended (otherwise the source would be mutated
 *   before grok/dissect could read it).
 * - Otherwise the existing steps kept their original position and the new
 *   extraction was appended.
 *
 * Returns `null` when there are no existing steps, since the placement
 * decision is vacuous in that case.
 */
export const buildPlacementWarning = ({
  existingSteps,
  sourceFieldUsedByExisting,
  fieldName,
}: {
  existingSteps: StreamlangStep[];
  sourceFieldUsedByExisting: boolean;
  fieldName: string;
}): string | null => {
  if (existingSteps.length === 0) return null;
  const placement = sourceFieldUsedByExisting
    ? `New extraction was placed BEFORE the ${existingSteps.length} existing step(s) because at least one existing step writes to, renames, or removes the source field "${fieldName}".`
    : `${existingSteps.length} existing step(s) kept their original position; new extraction was appended at the end.`;
  return `${placement} Review that the new extraction does not duplicate or conflict with existing steps before applying.`;
};

/**
 * Surface a warning when an existing step already extracts (`grok` /
 * `dissect`) from the same source field — the new extraction may duplicate
 * its work. Returns `null` when no such existing step exists.
 *
 * The label distinguishes top-level steps from extraction nested inside a
 * condition block ("inside a condition block"), since a `where`-scoped
 * duplicate may be intentional (e.g. an error-only branch) and the user
 * should be told the placement so they can judge that.
 */
export const buildDuplicationWarning = ({
  existingSteps,
  fieldName,
}: {
  existingSteps: StreamlangStep[];
  fieldName: string;
}): string | null => {
  const conflicting = existingSteps.find((step) => isExtractionStepOnField(step, fieldName));
  if (!conflicting) return null;
  const label = isConditionBlock(conflicting)
    ? 'inside a condition block'
    : (conflicting as { action?: string }).action ?? 'step';
  return `An existing step already extracts from field "${fieldName}" (${label}). The new extraction may duplicate work — confirm with the user before applying.`;
};

/**
 * Compose the "may overwrite extracted field" warning when an existing
 * step writes to a field the new extraction is creating. Returns `null`
 * when there is no overlap so the caller can omit the warning entirely.
 *
 * Surfaced regardless of placement order: in either order, the agent and
 * user need to decide whether the existing step is now redundant or
 * should retain precedence.
 */
export const buildOverwriteWarning = (
  existingSteps: StreamlangStep[],
  fieldChanges: FieldChange[]
): string | null => {
  const createdFields = new Set(
    fieldChanges.filter((c) => c.change === 'created').map((c) => c.field)
  );
  if (createdFields.size === 0) return null;

  const overlaps = new Set<string>();
  for (const step of existingSteps) {
    for (const target of getStepWriteTargets(step)) {
      if (createdFields.has(target)) overlaps.add(target);
    }
  }
  if (overlaps.size === 0) return null;

  const fieldList = [...overlaps].map((f) => `"${f}"`).join(', ');
  return (
    `Existing step(s) write to field(s) ${fieldList} that the new extraction also produces. ` +
    `Depending on the step order one will overwrite the other — confirm whether the existing step ` +
    `should be kept, removed, or reordered before applying.`
  );
};
