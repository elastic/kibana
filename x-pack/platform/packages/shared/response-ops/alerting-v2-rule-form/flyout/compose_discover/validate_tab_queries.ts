/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
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
        return {
          tab,
          messages: [
            i18n.translate(
              'xpack.alertingV2.composeDiscover.querySandbox.validationFailedMessage',
              { defaultMessage: 'Could not validate this query. Try again.' }
            ),
          ],
        };
      }
    })
  );

  return results.filter((result): result is TabValidationError => result !== null);
};
