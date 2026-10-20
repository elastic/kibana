/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';
import { getAnySourceCommandFromESQLQuery } from '@kbn/esql-utils';

/**
 * Returns the source command (e.g. `FROM logs-*`, `TS metrics-*`, `PROMQL …`)
 * extracted from a full ES|QL pipeline. Used for index-level field lookups
 * such as resolving the time field.
 *
 * Matches any registered source command so FROM, TS, PROMQL, and future
 * sources stay in sync with the language registry.
 */
export function extractFromSourceQuery(query: string): string {
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
}
