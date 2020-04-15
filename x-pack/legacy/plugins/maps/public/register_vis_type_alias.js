/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { npSetup } from '../../../../../src/legacy/ui/public/new_platform';
import { i18n } from '@kbn/i18n';
import { APP_ID, APP_ICON, MAP_BASE_URL } from '../common/constants';

const showMapVisualizationTypes = chrome.getInjected('showMapVisualizationTypes', false);

const description = i18n.translate('xpack.maps.visTypeAlias.description', {
  defaultMessage: 'Create and style maps with multiple layers and indices.',
});

const legacyMapVisualizationWarning = i18n.translate(
  'xpack.maps.visTypeAlias.legacyMapVizWarning',
  {
    defaultMessage: `Use the Maps app instead of Coordinate Map and Region Map.
The Maps app offers more functionality and is easier to use.`,
  }
);

npSetup.plugins.visualizations.registerAlias({
  aliasUrl: MAP_BASE_URL,
  name: APP_ID,
  title: i18n.translate('xpack.maps.visTypeAlias.title', {
    defaultMessage: 'Maps',
  }),
  description: showMapVisualizationTypes
    ? `${description} ${legacyMapVisualizationWarning}`
    : description,
  icon: APP_ICON,
  stage: 'production',
});

if (!showMapVisualizationTypes) {
  npSetup.plugins.visualizations.hideTypes(['region_map', 'tile_map']);
}
