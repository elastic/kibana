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
import type { PrebuiltPackListItem } from '../../../common/prebuilt_packs';
import { failureReason } from './failure_reason';

const toOption = (item: PrebuiltPackListItem): SelectionOption<string> => ({
  value: item.asset_name,
  label: item.asset_name,
  // The space copy can be renamed (for example with an `-elastic` suffix); show it only then.
  description: item.description ?? (item.name !== item.asset_name ? item.name : ''),
  documentation: i18n.translate('xpack.osquery.workflows.selection.prebuiltPack.queryCount', {
    defaultMessage: '{count, plural, one {# query} other {# queries}}',
    values: { count: item.query_count },
  }),
});

const listPrebuiltPacks = async (http: HttpSetup): Promise<PrebuiltPackListItem[]> => {
  const { data } = await http.get<{ data?: PrebuiltPackListItem[] }>(
    '/internal/osquery/packs/_prebuilt',
    { version: API_VERSIONS.internal.v1 }
  );

  return data ?? [];
};

/**
 * Picker for `osquery.runPack` `prebuilt_pack`: lists the Elastic prebuilt packs loaded in this
 * space and stores the package name (for example `forensic-persistence`), which is the same in
 * every space, unlike the random id of each space copy. An asset id still resolves. A pack the
 * step could not resolve (resolve answers 409) is not offered and is explained instead.
 */
export const createPrebuiltPackSelection = (http: HttpSetup): PropertySelectionHandler<string> => {
  // A failed lookup must not look like "not loaded in this space", and an ambiguous pack must
  // not look like a missing one. Keyed by the looked-up value (the validator resolves in parallel).
  const lookupErrors = new Map<string, string>();

  return {
    search: async (input) => {
      const search = input.trim().toLowerCase();
      try {
        const packs = await listPrebuiltPacks(http);
        lookupErrors.delete(search);

        return packs
          .filter((pack) => !pack.unavailable_reason)
          .filter(
            (pack) =>
              !search ||
              pack.asset_name.toLowerCase().includes(search) ||
              pack.name.toLowerCase().includes(search)
          )
          .map(toOption);
      } catch (error) {
        lookupErrors.set(
          search,
          failureReason(
            error,
            i18n.translate('xpack.osquery.workflows.selection.prebuiltPack.requestFailed', {
              defaultMessage: 'The prebuilt pack request failed.',
            })
          )
        );

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
        lookupErrors.delete(name);
        if (!pack) return null;

        if (pack.unavailable_reason) {
          lookupErrors.set(
            name,
            i18n.translate('xpack.osquery.workflows.selection.prebuiltPack.ambiguous', {
              defaultMessage:
                'More than one asset has this name, or this space holds more than one copy of the pack, so the step cannot tell which to run. Use the asset id, or remove the extra copy.',
            })
          );

          return null;
        }

        return toOption(pack);
      } catch (error) {
        lookupErrors.set(
          name,
          failureReason(
            error,
            i18n.translate('xpack.osquery.workflows.selection.prebuiltPack.requestFailed', {
              defaultMessage: 'The prebuilt pack request failed.',
            })
          )
        );

        return null;
      }
    },
    getDetails: async (value, _context, option) => {
      const lookupError = lookupErrors.get(value.trim());

      return {
        message: option
          ? i18n.translate('xpack.osquery.workflows.selection.prebuiltPack.found', {
              defaultMessage: 'Runs this space\'s copy of the prebuilt pack "{name}".',
              values: { name: option.label ?? value },
            })
          : lookupError
          ? i18n.translate('xpack.osquery.workflows.selection.prebuiltPack.lookupFailed', {
              defaultMessage: 'Could not use prebuilt pack "{id}": {reason}',
              values: { id: value, reason: lookupError },
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
            path: http.basePath.prepend('/app/osquery/packs'),
          },
        ],
      };
    },
  };
};
