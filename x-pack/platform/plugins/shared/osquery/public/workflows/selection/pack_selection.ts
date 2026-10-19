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

interface PackItem {
  saved_object_id: string;
  name: string;
  description?: string;
  queries?: Record<string, unknown> | unknown[];
}

const queryCount = (queries: PackItem['queries']) =>
  Array.isArray(queries) ? queries.length : Object.keys(queries ?? {}).length;

const toOption = (item: PackItem): SelectionOption<string> => ({
  value: item.saved_object_id,
  label: item.name,
  description: item.description ?? '',
  documentation: i18n.translate('xpack.osquery.workflows.selection.pack.queryCount', {
    defaultMessage: '{count, plural, one {# query} other {# queries}}',
    values: { count: queryCount(item.queries) },
  }),
});

/**
 * Picker for `osquery.runPack` `pack_id`: shows pack names, stores the pack's saved-object id,
 * which is what the live-query route takes. Prebuilt packs have their own picker
 * (`prebuilt_pack`) because their space copies get a random id.
 */
export const createPackSelection = (http: HttpSetup): PropertySelectionHandler<string> => ({
  search: async (input) => {
    const search = input.trim();
    try {
      const { data } = await http.get<{ data?: PackItem[] }>('/api/osquery/packs', {
        version: API_VERSIONS.public.v1,
        // The route searches name and description with `simple_query_string`: a trailing `*`
        // matches while the user is still typing a word.
        query: { page: 1, pageSize: PAGE_SIZE, ...(search ? { search: `${search}*` } : {}) },
      });

      return (data ?? []).map(toOption);
    } catch {
      return [];
    }
  },
  resolve: async (value) => {
    const id = value.trim();
    if (!id) return null;

    try {
      const { data } = await http.get<{ data: Omit<PackItem, 'saved_object_id'> }>(
        `/api/osquery/packs/${encodeURIComponent(id)}`,
        { version: API_VERSIONS.public.v1 }
      );

      return toOption({ ...data, saved_object_id: id });
    } catch {
      return null;
    }
  },
  getDetails: async (value, _context, option) => ({
    message: option
      ? i18n.translate('xpack.osquery.workflows.selection.pack.found', {
          defaultMessage: 'Pack "{name}" runs as a live pack; disabled queries are skipped.',
          values: { name: option.label ?? value },
        })
      : i18n.translate('xpack.osquery.workflows.selection.pack.notFound', {
          defaultMessage: 'No pack with id "{id}" in this space.',
          values: { id: value },
        }),
    links: [
      {
        text: i18n.translate('xpack.osquery.workflows.selection.pack.manage', {
          defaultMessage: 'Manage packs',
        }),
        path: '/app/osquery/packs',
      },
    ],
  }),
});
