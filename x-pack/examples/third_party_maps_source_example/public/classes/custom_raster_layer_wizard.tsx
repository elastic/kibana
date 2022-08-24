/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { LAYER_WIZARD_CATEGORY } from '@kbn/maps-plugin/common';
import type { LayerWizard, RenderWizardArguments } from '@kbn/maps-plugin/public';
import { PLUGIN_ID } from '../../common';
import { CustomRasterEditor } from './custom_raster_editor';

export const customRasterLayerWizard: LayerWizard = {
  id: PLUGIN_ID,
  categories: [LAYER_WIZARD_CATEGORY.REFERENCE],
  title: 'Weather',
  description: 'Weather data provided by NOAA',
  icon: '',
  order: 100,
  renderWizard: (renderWizardArguments: RenderWizardArguments) => {
    return <CustomRasterEditor {...renderWizardArguments} />;
  },
};
