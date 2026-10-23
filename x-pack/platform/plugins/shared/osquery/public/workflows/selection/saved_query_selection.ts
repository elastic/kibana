/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { PropertySelectionHandler, SelectionOption } from '@kbn/workflows/types/latest';
import { API_VERSIONS } from '../../../common/constants';

const PAGE_SIZE = 20;

interface SavedQueryItem {
  id: string;
  description?: string;
  query?: string;
}

const toOption = (item: SavedQueryItem): SelectionOption<string> => ({
  value: item.id,
  label: item.id,
  description: item.description ?? '',
  // The editor shows `documentation` as plain text, not Markdown: no code fences.
  ...(item.query ? { documentation: item.query } : {}),
});

const failureReason = (error: unknown): string => {
  const httpError = error as { body?: { message?: unknown }; message?: unknown };
  if (typeof httpError.body?.message === 'string' && httpError.body.message) {
    return httpError.body.message;
  }

  if (typeof httpError.message === 'string' && httpError.message) {
    return httpError.message;
  }

  return i18n.translate('xpack.osquery.workflows.selection.savedQuery.requestFailed', {
    defaultMessage: 'The saved query request failed.',
  });
};

/**
 * Picker for `osquery.runQuery` `saved_query`. It stores the saved query's name (its `id`
 * attribute), which is what the step and the live-query route resolve, and which stays the same
 * across spaces for integration-installed queries; saved-object ids do not.
 */
export const createSavedQuerySelection = (http: HttpSetup): PropertySelectionHandler<string> => {
  // A failed lookup must not look like "no such saved query". Autocomplete still returns no
  // options; the validation message explains why.
  let lookupError: string | undefined;

  return {
    search: async (input) => {
      const search = input.trim();
      try {
        const { data } = await http.get<{ data?: SavedQueryItem[] }>('/api/osquery/saved_queries', {
          version: API_VERSIONS.public.v1,
          query: {
            page: 1,
            pageSize: PAGE_SIZE,
            sort: 'id',
            sortOrder: 'asc',
            ...(search ? { search } : {}),
          },
        });
        lookupError = undefined;

        return (data ?? []).map(toOption);
      } catch (error) {
        lookupError = failureReason(error);

        return [];
      }
    },
    resolve: async (value) => {
      const name = value.trim();
      if (!name) return null;

      try {
        // Exact match on the name: fuzzy `search` can rank another query first.
        const { data } = await http.get<{ data?: SavedQueryItem[] }>('/api/osquery/saved_queries', {
          version: API_VERSIONS.public.v1,
          query: { id: name, page: 1, pageSize: 2 },
        });
        lookupError = undefined;
        const matches = (data ?? []).filter((item) => item.id === name);

        return matches.length === 1 ? toOption(matches[0]) : null;
      } catch (error) {
        lookupError = failureReason(error);

        return null;
      }
    },
    getDetails: async (value, _context, option) => ({
      message: option
        ? i18n.translate('xpack.osquery.workflows.selection.savedQuery.found', {
            defaultMessage: 'Saved query "{name}" runs as stored, in the workflow space.',
            values: { name: option.label ?? value },
          })
        : lookupError
        ? i18n.translate('xpack.osquery.workflows.selection.savedQuery.loadFailed', {
            defaultMessage: 'Could not load saved queries: {reason}',
            values: { reason: lookupError },
          })
        : i18n.translate('xpack.osquery.workflows.selection.savedQuery.notFound', {
            defaultMessage:
              'No saved query named "{name}" in this space. Integration saved queries need the integration assets installed in this space.',
            values: { name: value },
          }),
      links: [
        {
          text: i18n.translate('xpack.osquery.workflows.selection.savedQuery.manage', {
            defaultMessage: 'Manage saved queries',
          }),
          path: '/app/osquery/saved_queries',
        },
      ],
    }),
  };
};
