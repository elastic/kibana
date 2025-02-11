/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { LAYER_WIZARD_CATEGORY, WIZARD_ID } from '../../../../../common/constants';
import { LayerWizard, RenderWizardArguments } from '../layer_wizard_registry';
import { WizardForm } from './wizard_form';
import { SpatialJoinLayerIcon } from '../icons/spatial_join_layer_icon';

export const spatialJoinWizardConfig: LayerWizard = {
  id: WIZARD_ID.SPATIAL_JOIN,
  order: 10,
  categories: [LAYER_WIZARD_CATEGORY.ELASTICSEARCH],
  description: i18n.translate('xpack.maps.spatialJoinWizard.description', {
    defaultMessage: 'Group documents by geospatial relationships',
  }),
  icon: SpatialJoinLayerIcon,
  renderWizard: (renderWizardArguments: RenderWizardArguments) => {
    return <WizardForm {...renderWizardArguments} />;
  },
  title: i18n.translate('xpack.maps.spatialJoinWizard.title', {
    defaultMessage: 'Spatial join',
  }),
};
