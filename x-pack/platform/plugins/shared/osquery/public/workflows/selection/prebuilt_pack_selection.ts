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
import {
  PREBUILT_PACK_UNAVAILABLE_REASON,
  type PrebuiltPackListItem,
} from '../../../common/prebuilt_packs';
import { failureReason } from './failure_reason';

/**
 * A shared package name only makes the name ambiguous: resolve still answers for the asset id
 * when this space holds exactly one copy of that asset. Such a pack is stored by asset id.
 */
const isRunnableByAssetIdOnly = (item: PrebuiltPackListItem): boolean =>
  item.unavailable_reason === PREBUILT_PACK_UNAVAILABLE_REASON.duplicateAssetName &&
  item.copies === 1;

/** The value resolve answers 200 for, or undefined when it answers 409 for every handle. */
const storedValue = (item: PrebuiltPackListItem): string | undefined => {
  if (!item.unavailable_reason) return item.asset_name;

  return isRunnableByAssetIdOnly(item) ? item.asset_id : undefined;
};

const toOption = (item: PrebuiltPackListItem, value: string): SelectionOption<string> => ({
  value,
  label: value,
  // The space copy can be renamed (for example with an `-elastic` suffix); show it only then.
  description: item.description ?? (item.name !== value ? item.name : ''),
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
 * every space, unlike the random id of each space copy. An asset id still resolves. When several
 * assets share a package name, the asset id is the stored value instead. A pack the step could
 * not resolve (resolve answers 409) is not offered and is explained instead.
 */
export const createPrebuiltPackSelection = (http: HttpSetup): PropertySelectionHandler<string> => {
  // A failed lookup must not look like "not loaded in this space", and an ambiguous pack must
  // not look like a missing one. Keyed by the looked-up value (the validator resolves in parallel).
  const lookupErrors = new Map<string, string>();
  // The validator resolves every runPack step at once: share one request while it is in flight.
  // Not cached past that, so packs loaded or removed meanwhile show up on the next lookup.
  let inFlight: Promise<PrebuiltPackListItem[]> | undefined;
  const listPacks = () => {
    inFlight ??= listPrebuiltPacks(http).finally(() => {
      inFlight = undefined;
    });

    return inFlight;
  };

  return {
    search: async (input) => {
      const search = input.trim().toLowerCase();
      try {
        const packs = await listPacks();
        lookupErrors.delete(search);

        return packs.flatMap((pack) => {
          const value = storedValue(pack);
          if (!value) return [];
          const matches =
            !search ||
            pack.asset_name.toLowerCase().includes(search) ||
            pack.name.toLowerCase().includes(search) ||
            value.toLowerCase().includes(search);

          return matches ? [toOption(pack, value)] : [];
        });
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
        const packs = await listPacks();
        // An asset id is unique, a package name may not be: try the id first.
        const pack =
          packs.find((item) => item.asset_id === name) ??
          packs.find((item) => item.asset_name === name);
        lookupErrors.delete(name);
        if (!pack) return null;

        if (pack.asset_id === name && isRunnableByAssetIdOnly(pack)) {
          return toOption(pack, pack.asset_id);
        }

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

        return toOption(pack, pack.asset_name);
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
