/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { XYZTMSEditor, XYZTMSSourceConfig } from './xyz_tms_editor';
import { XYZTMSSource, sourceTitle } from './xyz_tms_source';
import { LayerWizard, RenderWizardArguments } from '../../layers';
import { RasterTileLayer } from '../../layers/raster_tile_layer/raster_tile_layer';
import { LAYER_WIZARD_CATEGORY, WIZARD_ID } from '../../../../common/constants';
import { WorldMapLayerIcon } from '../../layers/wizards/icons/world_map_layer_icon';

export const tmsLayerWizardConfig: LayerWizard = {
  id: WIZARD_ID.TMS_LAYER,
  order: 10,
  categories: [LAYER_WIZARD_CATEGORY.REFERENCE],
  description: i18n.translate('xpack.maps.source.ems_xyzDescription', {
    defaultMessage: 'Raster image tile map service using {z}/{x}/{y} url pattern.',
    values: {
      z: '{z}',
      x: '{x}',
      y: '{y}',
    },
  }),
  icon: WorldMapLayerIcon,
  renderWizard: ({ previewLayers }: RenderWizardArguments) => {
    const onSourceConfigChange = (sourceConfig: XYZTMSSourceConfig | null) => {
      if (!sourceConfig) {
        previewLayers([]);
        return;
      }

      const layerDescriptor = RasterTileLayer.createDescriptor({
        sourceDescriptor: XYZTMSSource.createDescriptor(sourceConfig),
      });
      previewLayers([layerDescriptor]);
    };
    return <XYZTMSEditor onSourceConfigChange={onSourceConfigChange} />;
  },
  title: sourceTitle,
};
