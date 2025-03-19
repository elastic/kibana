/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { type EmbeddableApiContext, apiIsOfType } from '@kbn/presentation-publishing';
import { createAction } from '@kbn/ui-actions-plugin/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { isLensApi } from '@kbn/lens-plugin/public';
import { apiHasVisualizeConfig } from '@kbn/visualizations-plugin/public';
import { Suspense, lazy } from 'react';
import { EuiModalBody, EuiSkeletonText } from '@elastic/eui';
import React from 'react';
import { getCore } from '../../kibana_services';
import { isLegacyMapApi } from '../../legacy_visualizations/is_legacy_map';
import { MAP_SAVED_OBJECT_TYPE } from '../../../common/constants';
import { mapEmbeddablesSingleton } from '../../react_embeddable/map_embeddables_singleton';
import { SYNCHRONIZE_MOVEMENT_ACTION } from './constants';

export const synchronizeMovementAction = createAction<EmbeddableApiContext>({
  id: SYNCHRONIZE_MOVEMENT_ACTION,
  type: SYNCHRONIZE_MOVEMENT_ACTION,
  order: 21,
  getDisplayName: () =>
    i18n.translate('xpack.maps.synchronizeMovementAction.title', {
      defaultMessage: 'Synchronize map movement',
    }),
  getDisplayNameTooltip: () =>
    i18n.translate('xpack.maps.synchronizeMovementAction.tooltipContent', {
      defaultMessage:
        'Synchronize maps, so that if you zoom and pan in one map, the movement is reflected in other maps',
    }),
  getIconType: () => 'crosshairs',
  isCompatible: async ({ embeddable }: EmbeddableApiContext) => {
    return (
      mapEmbeddablesSingleton.hasMultipleMaps() &&
      (apiIsOfType(embeddable, MAP_SAVED_OBJECT_TYPE) ||
        (isLensApi(embeddable) &&
          embeddable.getSavedVis()?.visualizationType === 'lnsChoropleth') ||
        (apiHasVisualizeConfig(embeddable) && isLegacyMapApi(embeddable)))
    );
  },
  execute: async () => {
    const core = getCore();
    const LazyModal = lazy(async () => {
      const { SynchronizeMovementModal } = await import('./modal');
      return {
        default: SynchronizeMovementModal,
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
          <LazyModal onClose={() => overlayRef.close()} />
        </Suspense>,
        core
      )
    );
  },
});
