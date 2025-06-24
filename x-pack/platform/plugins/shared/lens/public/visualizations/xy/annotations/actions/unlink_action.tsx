/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToastsStart } from '@kbn/core-notifications-browser';
import { i18n } from '@kbn/i18n';
import type { LayerAction, StateSetter } from '../../../../types';
import {
  XYByReferenceAnnotationLayerConfig,
  XYByValueAnnotationLayerConfig,
  XYState,
} from '../../types';
import { getAnnotationLayerTitle } from '../../visualization_helpers';

export const getUnlinkLayerAction = ({
  state,
  layer,
  setState,
  toasts,
}: {
  state: XYState;
  layer: XYByReferenceAnnotationLayerConfig;
  setState: StateSetter<XYState, unknown>;
  toasts: ToastsStart;
}): LayerAction => {
  return {
    execute: () => {
      const unlinkedLayer: XYByValueAnnotationLayerConfig = {
        layerId: layer.layerId,
        layerType: layer.layerType,
        indexPatternId: layer.indexPatternId,
        ignoreGlobalFilters: layer.ignoreGlobalFilters,
        annotations: layer.annotations,
      };

      setState({
        ...state,
        layers: state.layers.map((layerToCheck) =>
          layerToCheck.layerId === layer.layerId ? unlinkedLayer : layerToCheck
        ),
      });

      toasts.addSuccess(
        i18n.translate('xpack.lens.xyChart.annotations.notificationUnlinked', {
          defaultMessage: `Unlinked "{title}"`,
          values: { title: getAnnotationLayerTitle(layer) },
        })
      );
    },
    description: i18n.translate('xpack.lens.xyChart.annotations.unlinksFromLibrary', {
      defaultMessage: 'Saves the annotation group as a part of the Lens Saved Object',
    }),
    displayName: i18n.translate('xpack.lens.xyChart.annotations.unlinkFromLibrary', {
      defaultMessage: 'Unlink from library',
    }),
    isCompatible: true,
    icon: 'unlink',
    'data-test-subj': 'lnsXY_annotationLayer_unlinkFromLibrary',
    order: 300,
  };
};
