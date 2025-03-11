/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { LayerWizard, RenderWizardArguments } from '../../layers';
import { EMSTMSSource, getSourceTitle } from './ems_tms_source';
import { EmsVectorTileLayer } from '../../layers/ems_vector_tile_layer/ems_vector_tile_layer';
import { EmsTmsSourceConfig } from './tile_service_select';
import { CreateSourceEditor } from './create_source_editor';
import { getEMSSettings } from '../../../kibana_services';
import { LAYER_WIZARD_CATEGORY, WIZARD_ID } from '../../../../common/constants';
import { WorldMapLayerIcon } from '../../layers/wizards/icons/world_map_layer_icon';

function getDescription() {
  const emsSettings = getEMSSettings();
  return i18n.translate('xpack.maps.source.emsTileSourceDescription', {
    defaultMessage: 'Basemap service from {host}',
    values: {
      host: emsSettings.isEMSUrlSet() ? emsSettings.getEMSRoot() : 'Elastic Maps Service',
    },
  });
}

export const emsBaseMapLayerWizardConfig: LayerWizard = {
  id: WIZARD_ID.EMS_BASEMAP,
  order: 10,
  categories: [LAYER_WIZARD_CATEGORY.REFERENCE],
  checkVisibility: async () => {
    const emsSettings = getEMSSettings();
    return emsSettings.isIncludeElasticMapsService();
  },
  description: getDescription(),
  disabledReason: i18n.translate('xpack.maps.source.emsTileDisabledReason', {
    defaultMessage: 'Elastic Maps Server requires an Enterprise license',
  }),
  getIsDisabled: () => {
    const emsSettings = getEMSSettings();
    return emsSettings.isEMSUrlSet() && !emsSettings.hasOnPremLicense();
  },
  icon: WorldMapLayerIcon,
  renderWizard: ({ previewLayers }: RenderWizardArguments) => {
    const onSourceConfigChange = (sourceConfig: EmsTmsSourceConfig) => {
      const layerDescriptor = EmsVectorTileLayer.createDescriptor({
        sourceDescriptor: EMSTMSSource.createDescriptor(sourceConfig),
      });
      previewLayers([layerDescriptor]);
    };

    return <CreateSourceEditor onTileSelect={onSourceConfigChange} />;
  },
  title: getSourceTitle(),
};
