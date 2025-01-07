/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { GeoJsonVectorLayer } from '../../layers/vector_layer';
import { LayerWizard, RenderWizardArguments } from '../../layers';
import { EMSFileCreateSourceEditor } from './create_source_editor';
import { EMSFileSource, getSourceTitle } from './ems_file_source';

// @ts-ignore
import { getEMSSettings } from '../../../kibana_services';
import { EMSFileSourceDescriptor } from '../../../../common/descriptor_types';
import { LAYER_WIZARD_CATEGORY, WIZARD_ID } from '../../../../common/constants';
import { EMSBoundariesLayerIcon } from '../../layers/wizards/icons/ems_boundaries_layer_icon';

function getDescription() {
  const emsSettings = getEMSSettings();
  return i18n.translate('xpack.maps.source.emsFileSourceDescription', {
    defaultMessage: 'Administrative boundaries from {host}',
    values: {
      host: emsSettings.isEMSUrlSet() ? emsSettings.getEMSRoot() : 'Elastic Maps Service',
    },
  });
}

export const emsBoundariesLayerWizardConfig: LayerWizard = {
  id: WIZARD_ID.EMS_BOUNDARIES,
  order: 10,
  categories: [LAYER_WIZARD_CATEGORY.REFERENCE],
  checkVisibility: async () => {
    const emsSettings = getEMSSettings();
    return emsSettings.isIncludeElasticMapsService();
  },
  description: getDescription(),
  disabledReason: i18n.translate('xpack.maps.source.emsFileDisabledReason', {
    defaultMessage: 'Elastic Maps Server requires an Enterprise license',
  }),
  getIsDisabled: () => {
    const emsSettings = getEMSSettings();
    return emsSettings.isEMSUrlSet() && !emsSettings.hasOnPremLicense();
  },
  icon: EMSBoundariesLayerIcon,
  renderWizard: ({ previewLayers, mapColors }: RenderWizardArguments) => {
    const onSourceConfigChange = (sourceConfig: Partial<EMSFileSourceDescriptor>) => {
      const sourceDescriptor = EMSFileSource.createDescriptor(sourceConfig);
      const layerDescriptor = GeoJsonVectorLayer.createDescriptor({ sourceDescriptor }, mapColors);
      previewLayers([layerDescriptor]);
    };
    return <EMSFileCreateSourceEditor onSourceConfigChange={onSourceConfigChange} />;
  },
  title: getSourceTitle(),
};
