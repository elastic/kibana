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
import { sanitizeSearch } from '../../common/sanitize_search';
import { failureReason } from './failure_reason';

const PAGE_SIZE = 20;

interface PackItem {
  name: string;
  description?: string;
  queries?: Record<string, unknown> | unknown[];
}

const queryCount = (queries: PackItem['queries']) =>
  Array.isArray(queries) ? queries.length : Object.keys(queries ?? {}).length;

const toOption = (item: PackItem): SelectionOption<string> => ({
  value: item.name,
  label: item.name,
  description: item.description ?? '',
  documentation: i18n.translate('xpack.osquery.workflows.selection.pack.queryCount', {
    defaultMessage: '{count, plural, one {# query} other {# queries}}',
    values: { count: queryCount(item.queries) },
  }),
});

const requestFailed = () =>
  i18n.translate('xpack.osquery.workflows.selection.pack.requestFailed', {
    defaultMessage: 'The pack request failed.',
  });

/** Enough to hold every pack whose name or description contains the exact name. */
const RESOLVE_PAGE_SIZE = 100;

/**
 * Picker for `osquery.runPack` `pack`: stores the pack name, which the step resolves in the
 * workflow's space (like `runQuery`'s `saved_query`), so a workflow keeps working across spaces
 * and re-imports. Prebuilt packs have their own picker (`prebuilt_pack`).
 */
export const createPackSelection = (http: HttpSetup): PropertySelectionHandler<string> => {
  // A failed lookup (403, network) must not look like "no such pack". Autocomplete still returns
  // no options; the validation message explains why. Keyed by the looked-up value because the
  // validator resolves every runPack step's `pack` in parallel.
  const lookupErrors = new Map<string, string>();

  return {
    search: async (input) => {
      const search = input.trim();
      // The route searches name and description with `simple_query_string`: operators typed by
      // the user are stripped, then a trailing `*` matches while they are still typing a word.
      const sanitized = sanitizeSearch(search);
      try {
        const { data } = await http.get<{ data?: PackItem[] }>('/api/osquery/packs', {
          version: API_VERSIONS.public.v1,
          query: {
            page: 1,
            pageSize: PAGE_SIZE,
            ...(sanitized ? { search: `${sanitized}*` } : {}),
          },
        });
        lookupErrors.delete(search);

        return (data ?? []).map(toOption);
      } catch (error) {
        lookupErrors.set(search, failureReason(error, requestFailed()));

        return [];
      }
    },
    resolve: async (value) => {
      const name = value.trim();
      if (!name) return null;

      try {
        // The route has no exact-name filter: search the quoted name, keep exact matches only.
        const { data } = await http.get<{ data?: PackItem[] }>('/api/osquery/packs', {
          version: API_VERSIONS.public.v1,
          query: {
            page: 1,
            pageSize: RESOLVE_PAGE_SIZE,
            search: `"${name.replace(/["\\]/g, '\\$&')}"`,
          },
        });
        const matches = (data ?? []).filter((pack) => pack.name === name);
        lookupErrors.delete(name);
        if (matches.length > 1) {
          lookupErrors.set(
            name,
            i18n.translate('xpack.osquery.workflows.selection.pack.ambiguous', {
              defaultMessage:
                'More than one pack has this name in this space, so the step cannot tell which to run. Rename the duplicates.',
            })
          );
        }

        return matches.length === 1 ? toOption(matches[0]) : null;
      } catch (error) {
        lookupErrors.set(name, failureReason(error, requestFailed()));

        return null;
      }
    },
    getDetails: async (value, _context, option) => {
      const lookupError = lookupErrors.get(value.trim());

      return {
        message: option
          ? i18n.translate('xpack.osquery.workflows.selection.pack.found', {
              defaultMessage:
                'Pack "{name}" runs as a live pack in the workflow space; disabled queries are skipped.',
              values: { name: option.label ?? value },
            })
          : lookupError
          ? i18n.translate('xpack.osquery.workflows.selection.pack.loadFailed', {
              defaultMessage: 'Could not load packs: {reason}',
              values: { reason: lookupError },
            })
          : i18n.translate('xpack.osquery.workflows.selection.pack.notFound', {
              defaultMessage: 'No pack named "{name}" in this space.',
              values: { name: value },
            }),
        links: [
          {
            text: i18n.translate('xpack.osquery.workflows.selection.pack.manage', {
              defaultMessage: 'Manage packs',
            }),
            // The validator renders the path as is, so it carries the space prefix itself.
            path: http.basePath.prepend('/app/osquery/packs'),
          },
        ],
      };
    },
  };
};
