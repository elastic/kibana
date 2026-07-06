/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateQuery } from '@kbn/esql-language';
import type { ESQLCallbacks } from '@kbn/esql-types';
import type { QueryTab } from './types';

type EsqlValidationError = Awaited<ReturnType<typeof validateQuery>>['errors'][number];

export interface TabValidationError {
  tab: QueryTab;
  messages: string[];
}

const getErrorText = (error: EsqlValidationError): string =>
  'text' in error ? error.text : error.message;

/**
 * Statically validates each tab's ES|QL query and returns one entry per tab
 * that has at least one error. Runs full validation (including the ES|QL
 * callbacks for column/source resolution), so it is meant to be invoked
 * on-demand — e.g. when the user clicks Apply — not on every keystroke, since
 * the callbacks issue real requests to Elasticsearch. Empty queries are
 * skipped, and a validation failure for one tab never rejects the whole batch.
 */
export const validateTabQueries = async (
  queries: Partial<Record<QueryTab, string>>,
  callbacks: ESQLCallbacks
): Promise<TabValidationError[]> => {
  const entries = Object.entries(queries) as Array<[QueryTab, string]>;

  const results = await Promise.all(
    entries.map(async ([tab, query]): Promise<TabValidationError | null> => {
      if (!query.trim()) return null;
      try {
        const { errors } = await validateQuery(query, callbacks);
        if (errors.length === 0) return null;
        return { tab, messages: errors.map(getErrorText) };
      } catch {
        return null;
      }
    })
  );

  return results.filter((result): result is TabValidationError => result !== null);
};
