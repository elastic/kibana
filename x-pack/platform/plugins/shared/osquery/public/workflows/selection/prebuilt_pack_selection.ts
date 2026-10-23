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

interface PrebuiltPackItem {
  asset_id: string;
  asset_name: string;
  name: string;
  description?: string;
  query_count: number;
}

const toOption = (item: PrebuiltPackItem): SelectionOption<string> => ({
  value: item.asset_name,
  label: item.asset_name,
  // The space copy can be renamed (for example with an `-elastic` suffix); show it only then.
  description: item.description ?? (item.name !== item.asset_name ? item.name : ''),
  documentation: i18n.translate('xpack.osquery.workflows.selection.prebuiltPack.queryCount', {
    defaultMessage: '{count, plural, one {# query} other {# queries}}',
    values: { count: item.query_count },
  }),
});

const listPrebuiltPacks = async (http: HttpSetup): Promise<PrebuiltPackItem[]> => {
  const { data } = await http.get<{ data?: PrebuiltPackItem[] }>(
    '/internal/osquery/packs/_prebuilt',
    { version: API_VERSIONS.internal.v1 }
  );

  return data ?? [];
};

/**
 * Picker for `osquery.runPack` `prebuilt_pack`: lists the Elastic prebuilt packs loaded in this
 * space and stores the package name (for example `forensic-persistence`), which is the same in
 * every space, unlike the random id of each space copy. An asset id still resolves.
 */
export const createPrebuiltPackSelection = (http: HttpSetup): PropertySelectionHandler<string> => ({
  search: async (input) => {
    const search = input.trim().toLowerCase();
    try {
      const packs = await listPrebuiltPacks(http);

      return packs
        .filter(
          (pack) =>
            !search ||
            pack.asset_name.toLowerCase().includes(search) ||
            pack.name.toLowerCase().includes(search)
        )
        .map(toOption);
    } catch {
      return [];
    }
  },
  resolve: async (value) => {
    const name = value.trim();
    if (!name) return null;

    try {
      const pack = (await listPrebuiltPacks(http)).find(
        (item) => item.asset_name === name || item.asset_id === name
      );

      return pack ? toOption(pack) : null;
    } catch {
      return null;
    }
  },
  getDetails: async (value, _context, option) => ({
    message: option
      ? i18n.translate('xpack.osquery.workflows.selection.prebuiltPack.found', {
          defaultMessage: 'Runs this space\'s copy of the prebuilt pack "{name}".',
          values: { name: option.label ?? value },
        })
      : i18n.translate('xpack.osquery.workflows.selection.prebuiltPack.notLoaded', {
          defaultMessage:
            'Prebuilt pack "{id}" is not loaded in this space. Load Elastic prebuilt packs in this space.',
          values: { id: value },
        }),
    links: [
      {
        text: i18n.translate('xpack.osquery.workflows.selection.prebuiltPack.manage', {
          defaultMessage: 'Manage packs',
        }),
        path: '/app/osquery/packs',
      },
    ],
  }),
});
