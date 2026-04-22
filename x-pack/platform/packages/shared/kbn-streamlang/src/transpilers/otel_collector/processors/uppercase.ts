/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UppercaseProcessor } from '../../../../types/processors';
import { conditionToOttl } from '../condition_to_ottl';
import type { Emission } from '../emission';
import { attributePath, withWhereClause } from './common';

/**
 * Emits `set(log.attributes["<to|from>"], ToUpperCase(log.attributes["<from>"])) where <cond>`.
 *
 * When `to` is omitted the transformation is applied in place.
 */
export const convertUppercaseProcessorToOtel = (processor: UppercaseProcessor): Emission => {
  const { from, to, ignore_missing = false, where } = processor;
  const fromAttr = attributePath(from);
  const targetAttr = attributePath(to ?? from);

  const whereParts: string[] = [];
  if (where) whereParts.push(conditionToOttl(where));
  if (!ignore_missing) whereParts.push(`${fromAttr} != nil`);

  const whereExpr = whereParts.length ? whereParts.map((p) => `(${p})`).join(' and ') : undefined;

  return {
    kind: 'transform',
    statements: [withWhereClause(`set(${targetAttr}, ToUpperCase(${fromAttr}))`, whereExpr)],
  };
};
