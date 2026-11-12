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
import { escapeMarkdown } from './escape_markdown';

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

// Keep the scan limit in sync with server/workflows/lib/resolve_pack.ts.
const RESOLVE_PAGE_SIZE = 100;
const RESOLVE_MAX_PAGES = 10;

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
  const validationErrors = new Map<string, string>();

  return {
    search: async (input) => {
      const search = input.trim();
      // The route searches name and description with `simple_query_string`: operators typed by
      // the user are stripped, then a trailing `*` matches while they are still typing a word.
      const sanitized = sanitizeSearch(search);
      try {
        const packs: PackItem[] = [];
        for (let page = 1; page <= RESOLVE_MAX_PAGES; page++) {
          const { data = [], total = 0 } = await http.get<{
            data?: PackItem[];
            total?: number;
          }>('/api/osquery/packs', {
            version: API_VERSIONS.public.v1,
            query: {
              page,
              pageSize: RESOLVE_PAGE_SIZE,
              ...(sanitized ? { search: `${sanitized}*` } : {}),
            },
          });
          packs.push(...data);
          if (data.length < RESOLVE_PAGE_SIZE || page * RESOLVE_PAGE_SIZE >= total) break;
          // An unseen duplicate could otherwise validate through the editor's option cache.
          if (page === RESOLVE_MAX_PAGES) return [];
        }

        lookupErrors.delete(input);
        validationErrors.delete(input);
        const counts = new Map<string, number>();
        for (const { name } of packs) counts.set(name, (counts.get(name) ?? 0) + 1);

        return packs
          .filter(({ name }) => counts.get(name) === 1)
          .slice(0, PAGE_SIZE)
          .map(toOption);
      } catch (error) {
        lookupErrors.set(input, failureReason(error, requestFailed()));

        return [];
      }
    },
    resolve: async (value) => {
      const name = value;
      if (!name.trim()) return null;

      lookupErrors.delete(name);
      validationErrors.delete(name);
      try {
        const matches: PackItem[] = [];
        let truncated = false;
        for (let page = 1; page <= RESOLVE_MAX_PAGES; page++) {
          // The route has no exact-name filter: search the quoted name, keep exact matches only.
          const { data = [], total = 0 } = await http.get<{
            data?: PackItem[];
            total?: number;
          }>('/api/osquery/packs', {
            version: API_VERSIONS.public.v1,
            query: {
              page,
              pageSize: RESOLVE_PAGE_SIZE,
              search: `"${name.replace(/["\\]/g, '\\$&')}"`,
            },
          });
          matches.push(...data.filter((pack) => pack.name === name));
          if (matches.length > 1) break;
          if (data.length < RESOLVE_PAGE_SIZE || page * RESOLVE_PAGE_SIZE >= total) break;
          if (page === RESOLVE_MAX_PAGES) truncated = true;
        }

        if (matches.length > 1) {
          validationErrors.set(
            name,
            i18n.translate('xpack.osquery.workflows.selection.pack.ambiguousErrorMessage', {
              defaultMessage: 'Multiple packs are named "{name}". Rename the duplicates.',
              values: { name: escapeMarkdown(name) },
            })
          );

          return null;
        }

        if (matches.length === 1) return toOption(matches[0]);
        if (truncated) {
          validationErrors.set(
            name,
            i18n.translate('xpack.osquery.workflows.selection.pack.tooManyMatchesErrorMessage', {
              defaultMessage: 'Too many packs match "{name}"; refine the name.',
              values: { name: escapeMarkdown(name) },
            })
          );
        }

        return null;
      } catch (error) {
        lookupErrors.set(name, failureReason(error, requestFailed()));

        return null;
      }
    },
    getDetails: async (value, _context, option) => {
      const lookupError = lookupErrors.get(value);

      return {
        message: option
          ? i18n.translate('xpack.osquery.workflows.selection.pack.found', {
              defaultMessage:
                'Pack "{name}" runs as a live pack in the workflow space; disabled queries are skipped.',
              values: { name: escapeMarkdown(option.label ?? value) },
            })
          : validationErrors.has(value)
          ? validationErrors.get(value) ?? ''
          : lookupError
          ? i18n.translate('xpack.osquery.workflows.selection.pack.loadFailed', {
              defaultMessage: 'Could not load packs: {reason}',
              values: { reason: escapeMarkdown(lookupError) },
            })
          : i18n.translate('xpack.osquery.workflows.selection.pack.notFound', {
              defaultMessage: 'No pack named "{name}" in this space.',
              values: { name: escapeMarkdown(value) },
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
