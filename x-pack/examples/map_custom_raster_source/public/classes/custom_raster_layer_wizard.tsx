/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { htmlIdGenerator } from '@elastic/eui';
import { LAYER_TYPE, LAYER_WIZARD_CATEGORY, LayerDescriptor } from '@kbn/maps-plugin/common';
import type { LayerWizard, RenderWizardArguments } from '@kbn/maps-plugin/public';
import { PLUGIN_ID } from '../../common';
import { CustomRasterSource, CustomRasterSourceConfig } from './custom_raster_source';
import { CustomRasterEditor } from './custom_raster_editor';

export const customRasterLayerWizard: LayerWizard = {
  id: PLUGIN_ID,
  categories: [LAYER_WIZARD_CATEGORY.REFERENCE],
  title: 'Custom raster layer',
  description: 'Display a custom raster layer',
  icon: '',
  order: 100,
  renderWizard: ({ previewLayers }: RenderWizardArguments) => {
    const onSourceConfigChange = (sourceConfig: CustomRasterSourceConfig | null) => {
      if (!sourceConfig) {
        previewLayers([]);
        return;
      }

      const customRasterLayerDescriptor: LayerDescriptor = {
        id: htmlIdGenerator()(),
        type: LAYER_TYPE.RASTER_TILE,
        sourceDescriptor: CustomRasterSource.createDescriptor({
          urlTemplate: sourceConfig.urlTemplate,
        }),
        style: {
          type: 'RASTER',
        },
      };

      previewLayers([customRasterLayerDescriptor]);
    };
    return <CustomRasterEditor onSourceConfigChange={onSourceConfigChange} />;
  },
};
