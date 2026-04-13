/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Condition, conditionToESQL, transpileEsql, isAlwaysCondition } from '@kbn/streamlang';
import type { WiredStream } from '../models/ingest/wired';
import { getEsqlViewName } from '../models/query/view_name';
import { getParentId } from '../shared/hierarchy';

export interface DefinitionToESQLQueryOptions {
  definition: WiredStream.Definition;
  routingCondition: Condition;
}

/**
 * Assembles an ES|QL query string for a draft stream's ES|QL view.
 *
 * Draft streams use read-time ES|QL views instead of ingest pipelines.
 * The generated query reads from the parent stream's view, filters by
 * the routing condition, and applies processing steps.
 *
 * OTel mapping aliases (e.g. message, trace.id) and passthrough
 * namespace resolution (e.g. attributes.host.name → host.name) are
 * handled by Elasticsearch at the index level when the parent view
 * reads from the underlying indices, so no explicit EVALs are needed.
 */
export async function definitionToESQLQuery(
  options: DefinitionToESQLQueryOptions
): Promise<string> {
  const { definition, routingCondition } = options;

  const parentId = getParentId(definition.name);
  if (!parentId) {
    throw new Error(`Draft stream "${definition.name}" must have a parent stream`);
  }

  const parentViewName = getEsqlViewName(parentId);

  const commands: string[] = [`FROM ${parentViewName}`];

  if (!isAlwaysCondition(routingCondition)) {
    commands.push(`WHERE ${conditionToESQL(routingCondition)}`);
  }

  if (definition.ingest.processing.steps.length > 0) {
    const result = await transpileEsql(definition.ingest.processing);
    commands.push(...result.commands);
  }

  const pipeline = commands.join('\n| ');
  return `SET unmapped_fields="LOAD";\n${pipeline}`;
}
