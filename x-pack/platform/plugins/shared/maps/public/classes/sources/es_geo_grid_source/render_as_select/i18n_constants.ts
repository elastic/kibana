/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CLUSTER_LABEL = i18n.translate('xpack.maps.source.esGeoGrid.pointsDropdownOption', {
  defaultMessage: 'Clusters',
});

export const GRID_LABEL = i18n.translate(
  'xpack.maps.source.esGeoGrid.gridRectangleDropdownOption',
  {
    defaultMessage: 'Grids',
  }
);

export const HEX_LABEL = i18n.translate('xpack.maps.source.esGeoGrid.hexDropdownOption', {
  defaultMessage: 'Hexagons',
});
