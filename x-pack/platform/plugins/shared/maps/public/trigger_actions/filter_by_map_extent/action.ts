/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  type EmbeddableApiContext,
  apiHasType,
  apiIsOfType,
  areTriggersDisabled,
} from '@kbn/presentation-publishing';
import { createAction } from '@kbn/ui-actions-plugin/public';
import { apiHasVisualizeConfig } from '@kbn/visualizations-plugin/public';
import { type FilterByMapExtentActionApi } from './types';
import { MAP_SAVED_OBJECT_TYPE } from '../../../common/constants';
import { isLegacyMapApi } from '../../legacy_visualizations/is_legacy_map';

export const FILTER_BY_MAP_EXTENT = 'FILTER_BY_MAP_EXTENT';

export const isApiCompatible = (api: unknown | null): api is FilterByMapExtentActionApi =>
  Boolean(apiHasType(api));

function getContainerLabel(api: FilterByMapExtentActionApi | unknown) {
  return isApiCompatible(api) && api.parentApi?.type === 'dashboard'
    ? i18n.translate('xpack.maps.filterByMapExtentMenuItem.dashboardLabel', {
        defaultMessage: 'dashboard',
      })
    : i18n.translate('xpack.maps.filterByMapExtentMenuItem.pageLabel', {
        defaultMessage: 'page',
      });
}

function getDisplayName(api: FilterByMapExtentActionApi | unknown) {
  return i18n.translate('xpack.maps.filterByMapExtentMenuItem.displayName', {
    defaultMessage: 'Filter {containerLabel} by map bounds',
    values: { containerLabel: getContainerLabel(api) },
  });
}

export const filterByMapExtentAction = createAction<EmbeddableApiContext>({
  id: FILTER_BY_MAP_EXTENT,
  type: FILTER_BY_MAP_EXTENT,
  order: 20,
  getDisplayName: ({ embeddable }: EmbeddableApiContext) => {
    return getDisplayName(embeddable);
  },
  getDisplayNameTooltip: ({ embeddable }: EmbeddableApiContext) => {
    return i18n.translate('xpack.maps.filterByMapExtentMenuItem.displayNameTooltip', {
      defaultMessage:
        'As you zoom and pan the map, the {containerLabel} updates to display only the data visible in the map bounds.',
      values: { containerLabel: getContainerLabel(embeddable) },
    });
  },
  getIconType: () => {
    return 'filter';
  },
  isCompatible: async ({ embeddable }: EmbeddableApiContext) => {
    if (!isApiCompatible(embeddable) || areTriggersDisabled(embeddable)) return false;
    return (
      apiIsOfType(embeddable, MAP_SAVED_OBJECT_TYPE) ||
      (apiHasVisualizeConfig(embeddable) && isLegacyMapApi(embeddable))
    );
  },
  execute: async ({ embeddable }: EmbeddableApiContext) => {
    const { openModal } = await import('./modal');
    openModal(getDisplayName(embeddable));
  },
});
