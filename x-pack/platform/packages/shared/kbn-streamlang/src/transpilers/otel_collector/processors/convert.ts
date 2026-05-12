/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConvertProcessor } from '../../../../types/processors';
import { conditionToOttl } from '../condition_to_ottl';
import type { Emission } from '../emission';
import { attributePath, withWhereClause } from './common';

const OTTL_CONVERTER: Record<string, string> = {
  integer: 'Int',
  long: 'Int', // OTTL has no ToLong; Int() is 64-bit
  double: 'Double',
  string: 'String',
  boolean: 'Bool',
};

/**
 * Emits `set(log.attributes["<to|from>"], <Converter>(log.attributes["<from>"])) where <cond>`.
 *
 * Type mapping: integer/long → Int, double → Double, string → String, boolean → Bool.
 * OTTL's Int() is 64-bit so integer and long map identically.
 */
export const convertConvertProcessorToOtel = (processor: ConvertProcessor): Emission => {
  const { from, to, type, ignore_missing = false, where } = processor;
  const fromAttr = attributePath(from);
  const targetAttr = attributePath(to ?? from);
  const converter = OTTL_CONVERTER[type];

  if (!converter) {
    throw new Error(`OTel Collector transpiler: unknown convert type "${type}"`);
  }

  const whereParts: string[] = [];
  if (where) whereParts.push(conditionToOttl(where));
  if (!ignore_missing) whereParts.push(`${fromAttr} != nil`);

  const whereExpr = whereParts.length ? whereParts.map((p) => `(${p})`).join(' and ') : undefined;

  return {
    kind: 'transform',
    statements: [withWhereClause(`set(${targetAttr}, ${converter}(${fromAttr}))`, whereExpr)],
  };
};
