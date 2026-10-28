/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EntityGraphTraversalExpandedHop,
  EntityGraphTraversalPlan,
} from '@kbn/workflows/managed';
import { getFieldEvaluationsEsql } from '../../../../common/domain/euid';
import { euid, getBuiltInEntityDefinition } from '../../../../common/euid_helpers';
import type { GraphTraversalExclusion } from '../../../../common/graph_traversal';

/** Node ids are entity ids; an exclusion on this field removes nodes, not only documents. */
export const NODE_ID_EXCLUSION_FIELD = 'entity.id';

/**
 * Unmapped fields are loaded from `_source` instead of failing the statement: identity rules
 * reference fields (host.hostname, event.module, ...) a given index may not map, and the
 * relationship fields are often unmapped.
 */
export const GRAPH_EXPAND_PREAMBLE = 'SET unmapped_fields="load";';

export const GRAPH_EXPAND_ID_COLUMN = '__id';
export const GRAPH_EXPAND_COUNT_COLUMN = '__count';
export const graphExpandPayloadColumn = (index: number): string => `__payload_${index}`;
const relationColumn = (index: number): string => `__rel_${index}`;

const quoteField = (field: string): string => `\`${field}\``;

/** `24h` -> `24 hours`, the time-span literal ES|QL accepts in `NOW() - <span>`. */
const lookbackToEsqlSpan = (lookback: string): string => {
  const match = lookback.match(/^([0-9]{1,5})(m|h|d)$/);
  if (!match) {
    throw new Error(`Invalid lookback "${lookback}"; expected <number>(m|h|d)`);
  }
  const unit = { m: 'minutes', h: 'hours', d: 'days' }[match[2] as 'm' | 'h' | 'd'];
  return `${match[1]} ${unit}`;
};

export interface GraphExpandStatement {
  query: string;
  params: string[];
  /** Walk direction the statement uses: `both` when the scenario is an inverse hop pair. */
  direction: 'out' | 'both';
  /** Relation label of each `TO` column, in the order the columns are listed. */
  relations: string[];
  /** Relation label -> the hop spec's source and target types, for node typing. */
  relationTypes: Record<string, { source_type?: string; target_type?: string }>;
  /** Payload fields, in `__payload_<n>` order. */
  payloadFields: string[];
  /** Node ids the run excludes; edges to or from them are dropped from the result. */
  excludedIds: string[];
  maxHops: number;
}

export interface BuildGraphExpandParams {
  plan: EntityGraphTraversalPlan;
  seedId: string;
  lookback?: string;
  exclusions?: GraphTraversalExclusion[];
}

/** The distinct hop specs of a plan, in first-seen order (`repeat` unrolls specs consecutively). */
const distinctSpecs = (plan: EntityGraphTraversalPlan): EntityGraphTraversalExpandedHop[] => {
  const seen = new Set<string>();
  return plan.hops.filter((hop) => {
    if (seen.has(hop.name)) return false;
    seen.add(hop.name);
    return true;
  });
};

const sameFieldSet = (left: string[], right: string[]): boolean =>
  left.length === right.length && left.every((field) => right.includes(field));

/**
 * Spec `inverse` walks `spec`'s edges backwards: it matches on the fields `spec` emits and
 * emits the ids `spec` matches. One projection with direction `both` covers both specs.
 */
const isInverse = (
  spec: EntityGraphTraversalExpandedHop,
  inverse: EntityGraphTraversalExpandedHop
): boolean => {
  const specTargets = spec.target_fields.map((t) => t.field);
  const inverseMatches = (inverse.match_fields ?? []).map((m) => m.field);
  if (inverse.match_field !== undefined) inverseMatches.push(inverse.match_field);
  if (!sameFieldSet(specTargets, inverseMatches)) return false;
  if (spec.match_euid !== undefined) return inverse.target_euid?.type === spec.match_euid;
  if (spec.match_field !== undefined) {
    return (
      inverse.target_fields.length === 1 && inverse.target_fields[0].field === spec.match_field
    );
  }
  return false;
};

/** `CASE(filter, expression, NULL)` when the spec has a filter, else the expression. */
const gated = (spec: EntityGraphTraversalExpandedHop, expression: string): string =>
  spec.filter ? `CASE(${spec.filter}, ${expression}, NULL)` : expression;

const coalesce = (expressions: string[]): string =>
  expressions.length === 1 ? expressions[0] : `COALESCE(${expressions.join(', ')})`;

/**
 * Translate a traversal plan into one `GRAPH EXPAND` statement over a subquery that projects
 * every document of the scenario's indices to the id it is matched by and one column per
 * relation it emits.
 *
 * - A forward chain (each spec reads what the previous one reached) unions the specs' indices:
 *   `__id` coalesces each spec's id expression, and a relation column coalesces every field
 *   that emits that relation. A spec's filter gates only its own projections (`CASE`).
 * - Two specs where the second walks the first backwards (host -> indicators, then the same
 *   indicator fields -> host) become the first spec's projection walked with direction `both`.
 *
 * Ids and relation values are cast to strings so a hash and an address can share one node
 * type. EUID columns use the same identity rules the entity store applies. The seed and every
 * exclusion value are bound as parameters.
 */
export const buildGraphExpandStatement = ({
  plan,
  seedId,
  lookback,
  exclusions = [],
}: BuildGraphExpandParams): GraphExpandStatement => {
  const specs = distinctSpecs(plan);
  if (specs.length === 0) {
    throw new Error(`Scenario "${plan.id}" has no hops`);
  }
  const inversePair = specs.length === 2 && isInverse(specs[0], specs[1]);
  const projected = inversePair ? [specs[0]] : specs;
  const direction: GraphExpandStatement['direction'] = inversePair ? 'both' : 'out';

  const params: string[] = [];
  const placeholders = (values: string[]): string => {
    params.push(...values);
    return values.map(() => '?').join(', ');
  };

  const indices = Array.from(new Set(projected.flatMap((spec) => spec.index.split(','))));
  const lines: string[] = [
    GRAPH_EXPAND_PREAMBLE,
    `ROW node_id = ${placeholders([seedId])}`,
    `| GRAPH EXPAND (`,
  ];
  lines.push(`    FROM ${indices.join(',')}`);

  // Lookback: one guard per distinct time field; documents without the field pass.
  if (lookback) {
    const span = lookbackToEsqlSpan(lookback);
    const timeFields = Array.from(
      new Set(projected.map((spec) => spec.time_field).filter((f): f is string => f !== undefined))
    );
    for (const field of timeFields) {
      lines.push(
        `    | WHERE ${quoteField(field)} IS NULL OR ${quoteField(field)} >= NOW() - ${span}`
      );
    }
  }

  // Document exclusions: null-safe and multi-value safe.
  const excludedIds = exclusions
    .filter((e) => e.field === NODE_ID_EXCLUSION_FIELD)
    .flatMap((e) => e.values);
  for (const { field, values } of exclusions.filter((e) => e.field !== NODE_ID_EXCLUSION_FIELD)) {
    const quoted = quoteField(field);
    const contains = values.map(() => `MV_CONTAINS(${quoted}, ?)`).join(' OR ');
    placeholders(values);
    lines.push(`    | WHERE ${quoted} IS NULL OR NOT (${contains})`);
  }

  // Per-spec id expressions. EUID evaluations are multi-assignment EVALs computed first.
  const idExpressions: string[] = [];
  const euidEvals: string[] = [];
  projected.forEach((spec, index) => {
    if (spec.match_euid !== undefined) {
      const definition = getBuiltInEntityDefinition(spec.match_euid);
      const fieldEvaluations = getFieldEvaluationsEsql(definition);
      if (fieldEvaluations) euidEvals.push(`    | EVAL ${fieldEvaluations}`);
      const column = `__euid_${index}`;
      euidEvals.push(
        `    | EVAL ${euid.esql.getEuidEvaluation(definition, column, { withTypeId: true })}`
      );
      idExpressions.push(gated(spec, column));
    } else if (spec.match_field !== undefined) {
      idExpressions.push(gated(spec, `TO_STRING(${quoteField(spec.match_field)})`));
    } else if (spec.match_fields !== undefined) {
      idExpressions.push(
        gated(spec, coalesce(spec.match_fields.map((m) => `TO_STRING(${quoteField(m.field)})`)))
      );
    } else {
      throw new Error(`Hop "${spec.name}" sets none of match_field, match_fields or match_euid`);
    }
  });

  // Relation columns: every field that emits a relation, across specs, coalesced.
  const relationExpressions = new Map<string, string[]>();
  const relationTypes: GraphExpandStatement['relationTypes'] = {};
  const addRelation = (
    relation: string,
    expression: string,
    spec: EntityGraphTraversalExpandedHop
  ) => {
    relationExpressions.set(relation, [...(relationExpressions.get(relation) ?? []), expression]);
    relationTypes[relation] = relationTypes[relation] ?? {
      ...(spec.source_type !== undefined && { source_type: spec.source_type }),
      ...(spec.target_type !== undefined && { target_type: spec.target_type }),
    };
  };
  projected.forEach((spec, index) => {
    for (const { field, relation } of spec.target_fields) {
      addRelation(relation, gated(spec, `TO_STRING(${quoteField(field)})`), spec);
    }
    if (spec.target_euid !== undefined) {
      const definition = getBuiltInEntityDefinition(spec.target_euid.type);
      const fieldEvaluations = getFieldEvaluationsEsql(definition);
      if (fieldEvaluations) euidEvals.push(`    | EVAL ${fieldEvaluations}`);
      const column = `__target_euid_${index}`;
      euidEvals.push(
        `    | EVAL ${euid.esql.getEuidEvaluation(definition, column, { withTypeId: true })}`
      );
      addRelation(spec.target_euid.relation, gated(spec, column), spec);
    }
  });
  const relations = Array.from(relationExpressions.keys());
  if (relations.length === 0) {
    throw new Error(`Scenario "${plan.id}" emits no relations`);
  }

  lines.push(...euidEvals);
  const assignments = [
    `${GRAPH_EXPAND_ID_COLUMN} = ${coalesce(idExpressions)}`,
    ...relations.map(
      (relation, index) =>
        `${relationColumn(index)} = ${coalesce(relationExpressions.get(relation) ?? [])}`
    ),
  ];
  lines.push(`    | EVAL ${assignments.join(',\n           ')}`);
  // Excluded nodes expand nothing: their documents leave the edge set before the walk.
  if (excludedIds.length > 0) {
    lines.push(`    | WHERE NOT ${GRAPH_EXPAND_ID_COLUMN} IN (${placeholders(excludedIds)})`);
  }

  const payloadFields = Array.from(new Set(projected.flatMap((spec) => spec.payload_fields)));
  const stats = [
    `${GRAPH_EXPAND_COUNT_COLUMN} = COUNT(*)`,
    ...payloadFields.map(
      (field, index) => `${graphExpandPayloadColumn(index)} = VALUES(${quoteField(field)})`
    ),
  ];
  const { limits } = plan;
  const options = {
    max_hops: limits.max_hops,
    max_nodes: limits.max_nodes,
    max_frontier: limits.max_frontier,
    hub_degree: limits.hub_degree,
    direction,
  };
  lines.push(
    `  ) ON node_id == ${GRAPH_EXPAND_ID_COLUMN} TO (${relations
      .map((_, index) => relationColumn(index))
      .join(', ')})`,
    `  STATS ${stats.join(', ')}`,
    `  WITH ${JSON.stringify(options)}`
  );

  return {
    query: lines.join('\n'),
    params,
    direction,
    relations,
    relationTypes,
    payloadFields,
    excludedIds,
    maxHops: limits.max_hops,
  };
};

/** The relation label a `relation` result value (a `TO` column name) stands for. */
export const relationForColumn = (
  statement: Pick<GraphExpandStatement, 'relations'>,
  column: string | undefined
): string | undefined => {
  if (column === undefined) {
    return statement.relations.length === 1 ? statement.relations[0] : undefined;
  }
  const match = column.match(/^__rel_(\d+)$/);
  return match ? statement.relations[Number(match[1])] : undefined;
};
