/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LowercaseProcessor } from '../../../../types/processors';
import { conditionToOttl } from '../condition_to_ottl';
import type { Emission } from '../emission';
import { attributePath, withWhereClause } from './common';

/**
 * Emits `set(log.attributes["<to|from>"], ToLowerCase(log.attributes["<from>"])) where <cond>`.
 *
 * `ToLowerCase` uses OTTL's strict `StringGetter`; we add an `IsString` guard
 * so non-string attributes are skipped rather than triggering a TypeError that
 * would be swallowed by `error_mode: ignore`.
 */
export const convertLowercaseProcessorToOtel = (processor: LowercaseProcessor): Emission => {
  const { from, to, ignore_missing = false, where } = processor;
  const fromAttr = attributePath(from);
  const targetAttr = attributePath(to ?? from);

  const whereParts: string[] = [];
  if (where) whereParts.push(conditionToOttl(where));
  if (!ignore_missing) whereParts.push(`${fromAttr} != nil`);
  whereParts.push(`IsString(${fromAttr})`);

  const whereExpr = whereParts.length ? whereParts.map((p) => `(${p})`).join(' and ') : undefined;

  return {
    kind: 'transform',
    statements: [withWhereClause(`set(${targetAttr}, ToLowerCase(${fromAttr}))`, whereExpr)],
  };
};
