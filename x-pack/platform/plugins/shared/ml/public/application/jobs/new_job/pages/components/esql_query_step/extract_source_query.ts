/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';
import { getAnySourceCommandFromESQLQuery } from '@kbn/esql-utils';

/** Returns the source command (e.g. `FROM logs-*`) of an ES|QL query, or '' if there is none. */
export const extractSourceQuery = (query: string): string => {
  const trimmed = query.trim();
  if (!trimmed) {
    return '';
  }

  try {
    const sourceCommandName = getAnySourceCommandFromESQLQuery(trimmed);
    if (!sourceCommandName) {
      return '';
    }

    const { root } = Parser.parse(trimmed);
    const sourceCmd = root.commands.find((c) => c.name.toUpperCase() === sourceCommandName);
    if (!sourceCmd) {
      return '';
    }

    return trimmed.slice(sourceCmd.location.min, sourceCmd.location.max + 1).trim();
  } catch {
    return '';
  }
};

/** Inserts a time range WHERE clause, using the ?_tstart/?_tend params, directly after the source command. */
export const injectTimeFilter = (query: string, timeField: string): string => {
  const trimmed = query.trim();
  if (!trimmed) {
    return trimmed;
  }

  try {
    const { root } = Parser.parse(trimmed);
    const sourceCmd = root.commands.find((c) => c.name === 'from' || c.name === 'ts');
    if (!sourceCmd) {
      return trimmed;
    }

    const before = trimmed.slice(0, sourceCmd.location.max + 1).trimEnd();
    const after = trimmed.slice(sourceCmd.location.max + 1).trimStart();
    const whereClause = `| WHERE ${timeField} >= ?_tstart AND ${timeField} <= ?_tend`;
    return after ? `${before}\n${whereClause}\n${after}` : `${before}\n${whereClause}`;
  } catch {
    return trimmed;
  }
};
