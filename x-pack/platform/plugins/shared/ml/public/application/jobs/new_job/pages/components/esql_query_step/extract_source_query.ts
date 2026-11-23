/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';
import { getAnySourceCommandFromESQLQuery } from '@kbn/esql-utils';
import { escapeEsqlIdentifier } from '../../../../../../../common/util/esql_metric_query';

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

/**
 * Appends a time range WHERE clause on an output column, using the ?_tstart/?_tend params, so the
 * time field can be any column the query returns.
 */
export const appendTimeFilter = (query: string, timeField: string): string => {
  const trimmed = query.trim();
  if (!trimmed) {
    return trimmed;
  }
  const field = escapeEsqlIdentifier(timeField);
  return `${trimmed}\n| WHERE ${field} >= ?_tstart AND ${field} <= ?_tend`;
};
