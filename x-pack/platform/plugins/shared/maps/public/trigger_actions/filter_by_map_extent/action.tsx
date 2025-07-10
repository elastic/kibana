/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  type EmbeddableApiContext,
  apiIsOfType,
  areTriggersDisabled,
  HasParentApi,
  HasType,
} from '@kbn/presentation-publishing';
import { createAction } from '@kbn/ui-actions-plugin/public';
import { apiHasVisualizeConfig } from '@kbn/visualizations-plugin/public';
import React, { Suspense, lazy } from 'react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { EuiModalBody, EuiSkeletonText } from '@elastic/eui';
import { MAP_SAVED_OBJECT_TYPE } from '../../../common/constants';
import { isLegacyMapApi } from '../../legacy_visualizations/is_legacy_map';
import { getCore } from '../../kibana_services';
import { FILTER_BY_MAP_EXTENT } from './constants';

function getContainerLabel(api: unknown) {
  return (api as Partial<HasParentApi<Partial<HasType>>>)?.parentApi?.type === 'dashboard'
    ? i18n.translate('xpack.maps.filterByMapExtentMenuItem.dashboardLabel', {
        defaultMessage: 'dashboard',
      })
    : i18n.translate('xpack.maps.filterByMapExtentMenuItem.pageLabel', {
        defaultMessage: 'page',
      });
}

function getDisplayName(api: unknown) {
  return i18n.translate('xpack.maps.filterByMapExtentMenuItem.displayName', {
    defaultMessage: 'Filter {containerLabel} by map bounds',
    values: { containerLabel: getContainerLabel(api) },
  });
}

export const filterByMapExtentAction = createAction<EmbeddableApiContext>({
  id: FILTER_BY_MAP_EXTENT,
  type: FILTER_BY_MAP_EXTENT,
  order: 20,
  getDisplayName: ({ embeddable }: EmbeddableApiContext) => getDisplayName(embeddable),
  getDisplayNameTooltip: ({ embeddable }: EmbeddableApiContext) =>
    i18n.translate('xpack.maps.filterByMapExtentMenuItem.displayNameTooltip', {
      defaultMessage:
        'As you zoom and pan the map, the {containerLabel} updates to display only the data visible in the map bounds.',
      values: { containerLabel: getContainerLabel(embeddable) },
    }),
  getIconType: () => 'filter',
  isCompatible: async ({ embeddable }: EmbeddableApiContext) => {
    return (
      !areTriggersDisabled(embeddable) &&
      (apiIsOfType(embeddable, MAP_SAVED_OBJECT_TYPE) ||
        (apiHasVisualizeConfig(embeddable) && isLegacyMapApi(embeddable)))
    );
  },
  execute: async ({ embeddable }: EmbeddableApiContext) => {
    const core = getCore();
    const LazyModal = lazy(async () => {
      const { FilterByMapExtentModal } = await import('./modal');
      return {
        default: FilterByMapExtentModal,
      };
    });
    const overlayRef = core.overlays.openModal(
      toMountPoint(
        <Suspense
          fallback={
            <EuiModalBody>
              <EuiSkeletonText />
            </EuiModalBody>
          }
        >
          <LazyModal onClose={() => overlayRef.close()} title={getDisplayName(embeddable)} />
        </Suspense>,
        core
      )
    );
  },
});
