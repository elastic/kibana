/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicPrettyPrinter, Builder } from '@elastic/esql';
import type { ESQLAstCommand } from '@elastic/esql/types';
import {
  type Condition,
  conditionToESQLAst,
  transpileEsql,
  isAlwaysCondition,
} from '@kbn/streamlang';
import type { FieldDefinitionType } from '../fields';
import type { WiredStream } from '../models/ingest/wired';
import { getEsqlViewName } from '../models/query/view_name';
import { getParentId } from '../shared/hierarchy';

export interface DefinitionToESQLQueryOptions {
  definition: WiredStream.Definition;
  routingCondition: Condition;
  inheritedFields?: Record<string, { type?: string }>;
  /**
   * When false, omits processing steps from the generated query.
   * Field-type casts (schema reflections) are always included since
   * they are the read-time equivalent of index mappings. Use this to
   * obtain a query suitable for fetching pre-processing samples
   * (e.g. on the Processing tab). Defaults to true.
   */
  includeProcessing?: boolean;
}

/**
 * Assembles an ES|QL query string for a draft stream's ES|QL view.
 *
 * Draft streams use read-time ES|QL views instead of ingest pipelines.
 * The generated query reads from the parent stream's view, filters by
 * the routing condition, and applies processing steps.
 *
 * The query does NOT include session-level directives like
 * `SET unmapped_fields="LOAD"` because they are not supported in
 * ES|QL view definitions — consumers should apply those at query time.
 *
 * OTel mapping aliases (e.g. message, trace.id) and passthrough
 * namespace resolution (e.g. attributes.host.name → host.name) are
 * handled by Elasticsearch at the index level when the parent view
 * reads from the underlying indices, so no explicit EVALs are needed.
 */
export async function definitionToESQLQuery(
  options: DefinitionToESQLQueryOptions
): Promise<string> {
  const { definition, routingCondition, inheritedFields, includeProcessing = true } = options;

  const parentId = getParentId(definition.name);
  if (!parentId) {
    throw new Error(`Draft stream "${definition.name}" must have a parent stream`);
  }

  const parentViewName = getEsqlViewName(parentId);

  // METADATA _source must be declared inside the view definition, not outside it.
  // Outer METADATA on a view produces null values — this is a known ES|QL tech-preview
  // limitation where view expansion drops outer metadataFields:
  // https://www.elastic.co/docs/reference/query-languages/esql/esql-views#esql-views-limitations
  // Placing it inside the FROM clause makes _source available as a regular column,
  // giving consumers (Processing tab, Discover, simulate.ingest) access to the full
  // raw document source alongside the typed ES|QL columns.
  const preProcessingCommands: ESQLAstCommand[] = [
    Builder.command({
      name: 'from',
      args: [
        Builder.expression.source.index(parentViewName),
        Builder.option({
          name: 'METADATA',
          args: [Builder.expression.column({ args: [Builder.identifier({ name: '_source' })] })],
        }),
      ],
    }),
  ];

  const inheritedCastCmd = buildInheritedFieldCasts(inheritedFields);
  if (inheritedCastCmd) {
    preProcessingCommands.push(inheritedCastCmd);
  }

  const ownFieldCastCmd = buildFieldTypeCasts(definition);

  // We don't want to include these casts when processing isn't added as the casts will produce null values
  // if no value exists, if those values are then fed into something like a simulation results can be misleading
  // (e.g. "you can't rename field X")
  if (ownFieldCastCmd && includeProcessing) {
    preProcessingCommands.push(ownFieldCastCmd);
  }

  if (!isAlwaysCondition(routingCondition)) {
    preProcessingCommands.push(
      Builder.command({ name: 'where', args: [conditionToESQLAst(routingCondition)] })
    );
  }

  let query = BasicPrettyPrinter.multiline(Builder.expression.query(preProcessingCommands), {
    pipeTab: '',
  });

  if (includeProcessing && definition.ingest.processing.steps.length > 0) {
    const result = await transpileEsql(definition.ingest.processing);
    if (result.commands.length > 0) {
      query += `\n| ${result.commands.join('\n| ')}`;
    }
  }

  if (ownFieldCastCmd && includeProcessing && definition.ingest.processing.steps.length > 0) {
    query += `\n| ${BasicPrettyPrinter.command(ownFieldCastCmd)}`;
  }

  return query;
}

const FIELD_TYPE_TO_ESQL_CAST: Partial<Record<FieldDefinitionType, string>> = {
  long: 'TO_LONG',
  unsigned_long: 'TO_UNSIGNED_LONG',
  integer: 'TO_INTEGER',
  short: 'TO_INTEGER',
  byte: 'TO_INTEGER',
  double: 'TO_DOUBLE',
  float: 'TO_DOUBLE',
  half_float: 'TO_DOUBLE',
  date: 'TO_DATETIME',
  date_nanos: 'TO_DATETIME',
  boolean: 'TO_BOOLEAN',
  ip: 'TO_IP',
  version: 'TO_VERSION',
  geo_point: 'TO_GEOPOINT',
  keyword: 'TO_STRING',
  match_only_text: 'TO_STRING',
  text: 'TO_STRING',
  wildcard: 'TO_STRING',
};

function buildCastAssignments(
  fields: Array<{ name: string; type: FieldDefinitionType }>
): ReturnType<typeof Builder.expression.func.binary>[] {
  const result: ReturnType<typeof Builder.expression.func.binary>[] = [];

  for (const { name, type } of fields) {
    const castFn = FIELD_TYPE_TO_ESQL_CAST[type];
    if (!castFn) continue;

    const col = Builder.expression.column(name);
    result.push(
      Builder.expression.func.binary('=', [
        col,
        Builder.expression.func.call(castFn, [Builder.expression.column(name)]),
      ])
    );
  }

  return result;
}

/**
 * Builds an EVAL command that casts mapped fields to their declared
 * types. This is the read-time equivalent of Elasticsearch index
 * mappings — on materialisation these casts are replaced by real
 * mappings on the backing data stream.
 *
 * Fields with `type: 'system'` or no type are skipped.
 */
function buildFieldTypeCasts(definition: WiredStream.Definition): ESQLAstCommand | null {
  const assignments = buildCastAssignments(
    Object.entries(definition.ingest.wired.fields)
      .filter(([, field]) => field.type && field.type !== 'system')
      .map(([name, field]) => ({ name, type: field.type as FieldDefinitionType }))
  );

  if (assignments.length === 0) return null;

  return Builder.command({ name: 'eval', args: assignments });
}

const STRING_CAST_TYPES = new Set(['keyword', 'match_only_text', 'text', 'wildcard']);

/**
 * Builds an EVAL command that casts all inherited non-keyword fields
 * to their declared types. Placed before routing and processing to
 * prevent "partially unmapped field" errors when a field is mapped
 * (e.g. boolean, long) in some backing indices but unmapped in others.
 *
 * For draft->draft chains the parent view already casts its own fields,
 * making these casts redundant but harmless (double-casting is a no-op).
 *
 * Temporary workaround until ES|QL natively handles partially mapped
 * fields: https://github.com/elastic/elasticsearch/issues/141995
 */
function buildInheritedFieldCasts(
  inheritedFields?: Record<string, { type?: string }>
): ESQLAstCommand | null {
  if (!inheritedFields) return null;

  const fieldsToCast = Object.entries(inheritedFields)
    .filter(
      ([, field]) => field.type && field.type !== 'system' && !STRING_CAST_TYPES.has(field.type)
    )
    .map(([name, field]) => ({ name, type: field.type as FieldDefinitionType }));

  const assignments = buildCastAssignments(fieldsToCast);

  if (assignments.length === 0) return null;

  return Builder.command({ name: 'eval', args: assignments });
}
