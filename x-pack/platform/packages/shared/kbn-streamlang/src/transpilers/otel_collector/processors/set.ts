/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SetProcessor } from '../../../../types/processors';
import { conditionToOttl } from '../condition_to_ottl';
import type { Emission } from '../emission';
import { attributePath, ottlLiteralFromAny, withWhereClause } from './common';

/**
 * Emits an OTTL `set(log.attributes["<to>"], <value>) where <cond>` statement.
 *
 * - `value`  → literal assignment
 * - `copy_from` → attribute-to-attribute copy
 * - `override: false` → adds `log.attributes["<to>"] == nil` to the where clause so
 *   existing values are preserved (mirrors ingest/ES|QL behavior)
 */
export const convertSetProcessorToOtel = (processor: SetProcessor): Emission => {
  if (processor.value === undefined && processor.copy_from === undefined) {
    throw new Error(`Set processor requires either 'value' or 'copy_from' parameter.`);
  }
  if (processor.value !== undefined && processor.copy_from !== undefined) {
    throw new Error(`Set processor cannot have both 'value' and 'copy_from' parameters.`);
  }

  const target = attributePath(processor.to);
  const rhs = processor.copy_from
    ? attributePath(processor.copy_from)
    : ottlLiteralFromAny(processor.value);

  const whereParts: string[] = [];
  if (processor.where) whereParts.push(conditionToOttl(processor.where));
  if (processor.override === false) whereParts.push(`${target} == nil`);

  const whereExpr = whereParts.length ? whereParts.map((p) => `(${p})`).join(' and ') : undefined;

  return {
    kind: 'transform',
    statements: [withWhereClause(`set(${target}, ${rhs})`, whereExpr)],
  };
};
