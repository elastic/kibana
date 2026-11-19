/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Condition } from '@kbn/streamlang';
import type {
  EntityDefinitionWithoutId,
  EuidAttribute,
  FieldEvaluation,
  FieldEvaluationWhenClauseFieldMappingThen,
  SetFieldsByCondition,
} from '../definitions/entity_schema';
import {
  getPostAggFilter,
  getPostStatsFieldOverrides,
  getPreAggFieldOverrides,
  isSingleFieldIdentity,
} from '../definitions/entity_schema';
import type { EuidGateOptions } from './commons';
import { assertEmittableEntityType, isEuidField, waiveForAlerts } from './commons';

export interface EuidPainlessOptions extends EuidGateOptions {
  /**
   * The per-field Painless fragments the script is built from. Defaults to
   * {@link docValuesExpressions}.
   */
  expressions?: PainlessFieldExpressions;
}

/**
 * The per-field Painless expressions a generated script is assembled from.
 *
 * They are passed in so that there is one EUID implementation, rather than one per context a
 * script can run in. Reading a field is the only part that cannot be shared — a search script
 * reads a document through `doc`, an update-by-query script through `ctx._source` — so that part
 * is supplied by the caller and the rest is generated from the entity definitions as usual.
 *
 * The effect is that a change to an entity's identity fields reaches every script, instead of each
 * one having to be kept in step by hand.
 */
export interface PainlessFieldExpressions {
  /** Painless boolean: the field is present and not empty. */
  isNotEmpty: (field: string) => string;
  /**
   * Painless boolean: the field is present, regardless of whether its value is empty.
   *
   * Distinct from {@link isNotEmpty} only for doc-values, where presence and emptiness are
   * separate checks. Reading `_source` collapses the two, since an empty string reads as absent.
   */
  isPresent: (field: string) => string;
  /** Painless expression yielding the field's value, or null. */
  value: (field: string) => string;
  /** Emitted once at the top of the script, when reading a field needs a helper function. */
  preamble?: string;
  /**
   * The one variable the generated reads are written against — `doc` for doc-values, the source
   * root for `_source`.
   *
   * Declared rather than assumed because a Painless user-defined function sees only its own
   * parameters, not `doc`, `params` or `ctx`. A wrapper that puts the evaluation in a function
   * declares `param` on it and passes `expression` at the call site.
   */
  rootBinding: { param: string; expression: string };
}

/** The doc-values implementation of {@link PainlessFieldExpressions}, and the default. */
export const docValuesExpressions: PainlessFieldExpressions = {
  isNotEmpty: (field) => {
    const escaped = escapePainlessField(field);
    return `doc.containsKey('${escaped}') && doc['${escaped}'].size() > 0 && doc['${escaped}'].value != null && doc['${escaped}'].value != ""`;
  },
  isPresent: (field) => {
    const escaped = escapePainlessField(field);
    return `doc.containsKey('${escaped}') && doc['${escaped}'].size() > 0`;
  },
  value: (field) => `doc['${escapePainlessField(field)}'].value`,
  rootBinding: { param: 'doc', expression: 'doc' },
};

/**
 * The name of the `_source` reader emitted as the preamble. Kept short because it appears once per
 * field read.
 */
const SOURCE_READER = '__euid_src';

/**
 * Mirrors `getFieldValue` in commons.ts, which is what the in-memory implementation uses: try the
 * flattened key first, then walk the nested path, collapse an array to its first element, and
 * treat an empty string as absent.
 *
 * Path segments are passed in as a list rather than split at runtime, because Painless regex is
 * disabled by default and the field names are known when the script is generated.
 */
const SOURCE_READER_PREAMBLE = `def ${SOURCE_READER}(def src, String flat, List path) { if (src == null) { return null; } def v = src.containsKey(flat) ? src[flat] : null; if (v == null) { def cur = src; for (int i = 0; i < path.size(); i++) { if (!(cur instanceof Map)) { return null; } cur = cur[path.get(i)]; if (cur == null) { return null; } } v = cur; } if (v instanceof List) { if (((List)v).isEmpty()) { return null; } v = ((List)v).get(0); } if (v == null || v instanceof Map || v instanceof List) { return null; } String r = String.valueOf(v); return r == "" ? null : r; }`;

/**
 * The `_source` implementation of {@link PainlessFieldExpressions}, for contexts with no
 * doc-values.
 *
 * `rootExpression` is the Painless expression holding the source, which differs by context:
 * `ctx._source` in update-by-query and ingest scripts, `params._source` in search script fields.
 */
export const createSourceExpressions = (rootExpression: string): PainlessFieldExpressions => {
  // Referenced by name so the expression can be passed into a wrapping function; see rootBinding.
  const param = '__euid_root';
  const value = (field: string) => {
    const flat = escapePainlessField(field);
    const segments = field.split('.').map((segment) => `'${escapePainlessField(segment)}'`);
    return `${SOURCE_READER}(${param},'${flat}',[${segments.join(',')}])`;
  };

  return {
    isNotEmpty: (field) => `${value(field)} != null`,
    isPresent: (field) => `${value(field)} != null`,
    value,
    preamble: SOURCE_READER_PREAMBLE,
    rootBinding: { param, expression: rootExpression },
  };
};

/** Reads `ctx._source`, for update-by-query and ingest scripts. */
export const sourceExpressions: PainlessFieldExpressions = createSourceExpressions('ctx._source');

/**
 * Keyword runtime field scripts must call emit(); they cannot return a value from the script root.
 *
 * We cannot use labeled blocks (`label: { }`) — Painless rejects the `:` token here.
 * We cannot use `while (true) { ... break }` when every path breaks — the compiler reports
 * `extraneous while loop`.
 *
 * Wrapping the evaluation in a `String`-returning function preserves ordinary `return`
 * statements from getEuidPainlessEvaluation without break/loop tricks.
 */
function wrapEvaluationScriptForKeywordRuntimeField(
  evaluationScript: string,
  expressions: PainlessFieldExpressions
): string {
  const fn = '___euid_rt_eval';
  // Painless has no nested function definitions, so the preamble has to sit at the script root
  // rather than inside the wrapper.
  const prefix = expressions.preamble ? `${expressions.preamble} ` : '';
  const { param, expression } = expressions.rootBinding;
  return `${prefix}String ${fn}(def ${param}) { ${evaluationScript} } String ___euid = ${fn}(${expression}); if (___euid != null) { emit(___euid); }`;
}

/**
 * Mirrors string-literal when-rules for fields that have evaluated vars (e.g. `entity.namespace`).
 * Used for pre-agg and `whenConditionTrueSetFieldsAfterStats` (see getEuidFromObject).
 */
function buildPreAggEvaluatedVarOverridesPreamble(
  whenRules: SetFieldsByCondition[] | undefined,
  evaluatedVars: Map<string, string>,
  expressions: PainlessFieldExpressions
): string {
  if (!whenRules?.length) {
    return '';
  }
  const parts: string[] = [];
  for (const rule of whenRules) {
    const cond = conditionToPainless(rule.condition, { evaluatedVars, expressions });
    for (const [field, value] of Object.entries(rule.fields)) {
      if (typeof value !== 'string') {
        continue;
      }
      const varName = evaluatedVars.get(field);
      if (varName === undefined) {
        continue;
      }
      parts.push(`if (${cond}) { ${varName} = "${escapePainlessString(value)}"; }`);
    }
  }
  return parts.length > 0 ? `${parts.join(' ')} ` : '';
}

/**
 * Returns an Elasticsearch runtime keyword field mapping whose Painless script
 * computes the typed EUID for the given entity definition.
 *
 * Example usage:
 * ```ts
 * runtime_mappings: { 'user_id': getEuidPainlessRuntimeMapping(userDefinition) }
 * ```
 *
 * For update contexts, where doc-values are unavailable, see
 * {@link getEuidPainlessSourceUpdateScript}.
 *
 * @param entityDefinition - The entity definition whose identity rules compute the EUID
 * @returns A runtime keyword field mapping (type + script) for use in runtime_mappings.
 */
export function getEuidPainlessRuntimeMapping(
  entityDefinition: EntityDefinitionWithoutId,
  options?: EuidPainlessOptions
): {
  type: 'keyword';
  script: { source: string };
} {
  const expressions = options?.expressions ?? docValuesExpressions;
  const returnScript = getEuidPainlessEvaluation(entityDefinition, options);
  const emitScript = wrapEvaluationScriptForKeywordRuntimeField(returnScript, expressions);
  return {
    type: 'keyword',
    script: { source: emitScript },
  };
}

/**
 * The update-context counterpart to {@link getEuidPainlessRuntimeMapping}: both assemble a whole
 * script around the fragments {@link getEuidPainlessEvaluation} produces, one to emit a runtime
 * field value, this one to write onto the document.
 *
 * A Painless script for update contexts — `update_by_query`, ingest — that derives the EUID for
 * each of `entityDefinitions` from `ctx._source` and runs `onEuids`, a snippet in which the local
 * `euids` is a `List` of the values found. When no definition resolves, the document is left
 * untouched via `ctx.op = 'noop'` rather than rewritten.
 *
 * All the definitions are evaluated in one script so a document is rewritten once rather than once
 * per entity type, and so the resulting list reflects a single read of the source.
 *
 * Reads `_source` because update contexts have no doc-values. That also means it resolves fields
 * the way the in-memory implementation does, which is not always the way doc-values do — a
 * multi-valued field yields the first value written rather than the lowest.
 */
export function getEuidPainlessSourceUpdateScript(
  entityDefinitions: EntityDefinitionWithoutId[],
  onEuids: string
): string {
  const { preamble, rootBinding } = sourceExpressions;

  const evaluators = entityDefinitions.map((entityDefinition) => ({
    fn: `__euid_eval_${entityDefinition.type}`,
    body: getEuidPainlessEvaluation(entityDefinition, {
      applyPostAggFilter: false,
      expressions: sourceExpressions,
    }),
  }));

  return [
    preamble ?? '',
    ...evaluators.map(({ fn, body }) => `String ${fn}(def ${rootBinding.param}) { ${body} }`),
    'List euids = new ArrayList(); String __euid;',
    ...evaluators.map(
      ({ fn }) =>
        `__euid = ${fn}(${rootBinding.expression}); if (__euid != null) { euids.add(__euid); }`
    ),
    `if (euids.isEmpty()) { ctx.op = 'noop'; } else { ${onEuids} }`,
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Constructs a Painless evaluation for the provided entity definition to generate the entity id.
 *
 * Applies the creation gate: a document that may not put an entity in the store yields `null`.
 * For entities that already exist, use {@link getEuidPainlessEvaluationForSearch}.
 *
 * Example usage:
 * ```ts
 * import { getEuidPainlessEvaluation } from './painless';
 *
 * const evaluation = getEuidPainlessEvaluation(hostDefinition);
 * // evaluation may look like:
 * // 'if (doc.containsKey('host.name') && doc['host.name'].size() > 0 && doc['host.name'].value != null && doc['host.name'].value != "") { return "host:" + doc['host.name'].value; } return null;'
 * ```
 *
 * @param entityDefinition - The entity definition whose identity rules compute the entity id
 * @returns A Painless evaluation string that computes the entity id.
 */
export function getEuidPainlessEvaluation(
  entityDefinition: EntityDefinitionWithoutId,
  options?: EuidPainlessOptions
): string {
  const { applyPostAggFilter = true, expressions = docValuesExpressions } = options ?? {};
  const { identityField, type: entityType } = entityDefinition;
  let prefixExpr = '';
  if (!identityField.skipTypePrepend) {
    assertEmittableEntityType(entityType);
    prefixExpr = `"${entityType}:" + `;
  }

  if (isSingleFieldIdentity(identityField)) {
    const field = identityField.singleField;
    return `if (${expressions.isNotEmpty(field)}) { return ${prefixExpr}${expressions.value(
      field
    )}; } return null;`;
  }

  const { euidRanking } = identityField;
  if (euidRanking.branches.length === 0) {
    throw new Error('No euid ranking branches found, invalid euid logic definition');
  }

  const evaluatedVars = new Map<string, string>();
  let preamble = '';
  const fieldEvaluations = identityField.fieldEvaluations ?? [];
  if (fieldEvaluations.length > 0) {
    const result = buildFieldEvaluationsPreamble(fieldEvaluations, expressions);
    preamble = result.preamble + ' ';
    result.evaluatedVars.forEach((v, k) => evaluatedVars.set(k, v));
  }
  preamble += buildPreAggEvaluatedVarOverridesPreamble(
    getPreAggFieldOverrides(entityDefinition),
    evaluatedVars,
    expressions
  );
  preamble += buildPreAggEvaluatedVarOverridesPreamble(
    getPostStatsFieldOverrides(entityDefinition),
    evaluatedVars,
    expressions
  );

  /** Same order as getEuidFromObject: field evals (and pre/post stats overrides) run before the pipeline gate. */
  const filterOpts: ConditionToPainlessOptions = { evaluatedVars, expressions };
  const filterChecks: string[] = [];
  const gateConditions = applyPostAggFilter
    ? [identityField.documentsFilter, waiveForAlerts(getPostAggFilter(entityDefinition))]
    : [identityField.documentsFilter];
  for (const filterCond of gateConditions.filter((c): c is Condition => Boolean(c))) {
    filterChecks.push(`if (!(${conditionToPainless(filterCond, filterOpts)})) { return null; }`);
  }
  const filterPreamble = filterChecks.length > 0 ? filterChecks.join(' ') + ' ' : '';

  const fieldCondition = (field: string): string => {
    const varName = evaluatedVars.get(field);
    if (varName) return `${varName} != null`;
    return expressions.isNotEmpty(field);
  };

  const fieldValueExpr = (field: string): string => {
    const varName = evaluatedVars.get(field);
    if (varName) return varName;
    return expressions.value(field);
  };

  const buildBranchClauses = (ranking: EuidAttribute[][]) =>
    ranking
      .map((composedField) => {
        const compositionCond = composedField
          .filter(isEuidField)
          .map((a) => fieldCondition(a.field))
          .join(' && ');
        const valueExpr = buildPainlessValueExprWithEvaluated(composedField, fieldValueExpr);
        return `if (${compositionCond}) { return ${prefixExpr}${valueExpr}; }`;
      })
      .join(' ');

  const hasConditionalBranch = euidRanking.branches.some((b) => b.when != null);
  if (!hasConditionalBranch && euidRanking.branches.length === 1) {
    return (
      preamble +
      filterPreamble +
      buildBranchClauses(euidRanking.branches[0].ranking) +
      ' return null;'
    );
  }

  const branchParts: string[] = [];
  for (let i = 0; i < euidRanking.branches.length; i++) {
    const branch = euidRanking.branches[i];
    const clauses = buildBranchClauses(branch.ranking);
    if (branch.when) {
      const cond = conditionToPainless(branch.when, { evaluatedVars, expressions });
      const prefix = i === 0 ? 'if' : 'else if';
      branchParts.push(`${prefix} (${cond}) { ${clauses} return null; }`);
    } else {
      branchParts.push(`else { ${clauses} return null; }`);
    }
  }
  const branchLogic = branchParts.join(' ');
  // When the last branch is `else { ... return null; }`, every path through the if / else if /
  // else chain already returns; a trailing `return null` is unreachable and Painless rejects it.
  const lastBranchPart = branchParts[branchParts.length - 1] ?? '';
  const endsWithExhaustiveElse = lastBranchPart.startsWith('else {');
  const trailingReturn = endsWithExhaustiveElse ? '' : ' return null;';
  return preamble + filterPreamble + branchLogic + trailingReturn;
}

/**
 * Like {@link getEuidPainlessEvaluation} without the creation gate, so IdP and shared-account
 * documents still resolve to an entity that already exists.
 *
 * For risk scoring and enrichment. The caller checks store membership; this only answers which
 * entity a document refers to.
 *
 * @param entityDefinition - The entity definition whose identity rules compute the entity id
 * @returns A Painless evaluation string that computes the entity id.
 */
export function getEuidPainlessEvaluationForSearch(
  entityDefinition: EntityDefinitionWithoutId
): string {
  return getEuidPainlessEvaluation(entityDefinition, { applyPostAggFilter: false });
}

export interface ConditionToPainlessOptions {
  /** Maps logical field names (e.g. entity.namespace) to Painless locals from field-eval preamble. */
  evaluatedVars?: ReadonlyMap<string, string>;
  /**
   * The per-field Painless fragments the condition is built from. Defaults to
   * {@link docValuesExpressions}.
   */
  expressions?: PainlessFieldExpressions;
}

/**
 * Translates a streamlang condition into a Painless boolean, reading fields through `expressions`
 * and/or evaluated locals. Handles and, or, not, and field predicates (eq, neq, exists, includes).
 *
 * @internal Exported for testing.
 */
export function conditionToPainless(
  condition: unknown,
  options?: ConditionToPainlessOptions
): string {
  const opts: ConditionToPainlessOptions = options ?? {};
  const expressions = opts.expressions ?? docValuesExpressions;
  if (!condition || typeof condition !== 'object') return 'false';
  const c = condition as Record<string, unknown>;
  if ('and' in c && Array.isArray(c.and)) {
    const parts = (c.and as unknown[]).map((sub) => conditionToPainless(sub, opts));
    return parts.length > 0 ? `(${parts.join(' && ')})` : 'true';
  }
  if ('or' in c && Array.isArray(c.or)) {
    const parts = (c.or as unknown[]).map((sub) => conditionToPainless(sub, opts));
    return parts.length > 0 ? `(${parts.join(' || ')})` : 'false';
  }
  if ('not' in c) {
    return `!(${conditionToPainless(c.not, opts)})`;
  }
  if ('always' in c) return 'true';
  if ('never' in c) return 'false';
  if ('field' in c && typeof c.field === 'string') {
    const field = c.field;
    const varName = opts.evaluatedVars?.get(field);
    if (varName !== undefined) {
      if ('eq' in c && c.eq !== undefined) {
        const val = escapePainlessString(String(c.eq));
        return `${varName} != null && ${varName} == "${val}"`;
      }
      if ('neq' in c && c.neq !== undefined) {
        const val = escapePainlessString(String(c.neq));
        return `(${varName} == null || ${varName} == "" || ${varName} != "${val}")`;
      }
      if ('exists' in c) {
        return c.exists
          ? `${varName} != null && ${varName} != ""`
          : `(${varName} == null || ${varName} == "")`;
      }
      if ('includes' in c) {
        const val = escapePainlessString(String(c.includes));
        return `${varName} != null && ${varName} != "" && ${varName}.contains("${val}")`;
      }
    }
    const nonEmpty = expressions.isNotEmpty(field);
    const valueExpr = expressions.value(field);
    if ('eq' in c && c.eq !== undefined) {
      const val = escapePainlessString(String(c.eq));
      return `(${nonEmpty} && ${valueExpr} == "${val}")`;
    }
    if ('neq' in c && c.neq !== undefined) {
      const val = escapePainlessString(String(c.neq));
      return `(!(${nonEmpty}) || ${valueExpr} != "${val}")`;
    }
    if ('exists' in c) {
      return c.exists ? nonEmpty : `!(${nonEmpty})`;
    }
    if ('includes' in c) {
      const val = escapePainlessString(String(c.includes));
      return `(${nonEmpty} && ${valueExpr}.contains("${val}"))`;
    }
  }
  return 'false';
}

function buildPainlessValueExprWithEvaluated(
  composedField: EuidAttribute[],
  fieldValueExpr: (field: string) => string
): string {
  if (composedField.length === 1 && isEuidField(composedField[0])) {
    return fieldValueExpr(composedField[0].field);
  }
  const parts = composedField.map((attr) => {
    if (isEuidField(attr)) {
      return fieldValueExpr(attr.field);
    }
    return `"${escapePainlessString(attr.sep)}"`;
  });
  return parts.join(' + ');
}

function escapePainlessField(field: string): string {
  return field.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function escapePainlessString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function toPainlessNullableStringLiteral(value: string | null): string {
  return value === null ? 'null' : `"${escapePainlessString(value)}"`;
}

function destinationToVarName(destination: string): string {
  return destination.replace(/\./g, '_');
}

/**
 * Generates a Painless block that implements a `{ field, mapping }` when-clause arm.
 *
 * The block is guarded by `varName == null` (first-match-wins: once a prior arm set the
 * destination variable, all subsequent arms are skipped) and by the caller-supplied `cond`
 * (the stringified condition that must be true for this arm to fire).
 *
 * Inside the block, `then.field` is read null-safely.
 * If the value is present and found in `then.mapping`, `varName` is assigned the mapped value;
 * otherwise `varName` remains `null` and the next when-clause arm is tried.
 */
function buildFieldMappingPainless(
  varName: string,
  cond: string,
  then: FieldEvaluationWhenClauseFieldMappingThen,
  expressions: PainlessFieldExpressions
): string {
  const fieldRead = `(${expressions.isPresent(then.field)} ? ${expressions.value(
    then.field
  )} : null)`;
  const branches = Object.entries(then.mapping)
    .map(
      ([from, to], i) =>
        `${i === 0 ? 'if' : 'else if'} (_mappedField == "${escapePainlessString(
          from
        )}") { ${varName} = "${escapePainlessString(to)}"; }`
    )
    .join(' ');
  return `if (${varName} == null && (${cond})) { String _mappedField = ${fieldRead}; if (_mappedField != null) { ${branches} } }`;
}

function buildFieldEvaluationsPreamble(
  evaluations: FieldEvaluation[],
  expressions: PainlessFieldExpressions
): {
  preamble: string;
  evaluatedVars: Map<string, string>;
} {
  const evaluatedVars = new Map<string, string>();
  const parts: string[] = [];
  for (const ev of evaluations) {
    const varName = destinationToVarName(ev.destination);
    evaluatedVars.set(ev.destination, varName);
    const stmts: string[] = [`String ${varName} = null;`, `String _src = null;`];
    for (const source of ev.sources) {
      if ('field' in source) {
        stmts.push(
          `if (_src == null && ${expressions.isNotEmpty(
            source.field
          )}) { _src = ${expressions.value(source.field)}; }`
        );
      } else {
        const delimInString = escapePainlessString(source.splitBy);
        stmts.push(
          `if (_src == null && ${expressions.isNotEmpty(
            source.firstChunkOfField
          )}) { String _raw = ${expressions.value(
            source.firstChunkOfField
          )}; int _idx = _raw.indexOf("${delimInString}"); String _first = _idx >= 0 ? _raw.substring(0, _idx) : _raw; if (_first != null && _first != "") { _src = _first; } }`
        );
      }
    }

    for (const clause of ev.whenClauses) {
      if ('sourceMatchesAny' in clause) {
        const conds = clause.sourceMatchesAny
          .map((v) => `_src == "${escapePainlessString(v)}"`)
          .join(' || ');
        stmts.push(
          `if (${varName} == null && _src != null && (${conds})) { ${varName} = "${escapePainlessString(
            clause.then
          )}"; }`
        );
      } else {
        const cond = conditionToPainless(clause.condition, { expressions });
        if (typeof clause.then === 'string') {
          stmts.push(
            `if (${varName} == null && (${cond})) { ${varName} = "${escapePainlessString(
              clause.then
            )}"; }`
          );
        } else {
          stmts.push(buildFieldMappingPainless(varName, cond, clause.then, expressions));
        }
      }
    }

    stmts.push(
      `if (${varName} == null && _src != null) { ${varName} = _src; } else if (${varName} == null) { ${varName} = ${toPainlessNullableStringLiteral(
        ev.fallbackValue
      )}; }`
    );

    parts.push(stmts.join(' '));
  }
  const preamble = parts.join(' ');
  return { preamble, evaluatedVars };
}
