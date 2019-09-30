/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setup as visualizationsSetup } from '../../../../../src/legacy/core_plugins/visualizations/public/legacy';
import { i18n } from '@kbn/i18n';
import { APP_ID, APP_ICON, MAP_BASE_URL } from '../common/constants';

visualizationsSetup.types.registerAlias({
  aliasUrl: MAP_BASE_URL,
  name: APP_ID,
  title: i18n.translate('xpack.maps.visTypeAlias.title', {
    defaultMessage: 'Maps',
  }),
  description: i18n.translate('xpack.maps.visTypeAlias.description', {
    defaultMessage: `Create and style maps with multiple layers and indices.
Use the Maps app instead of Coordinate Map and Region Map.
The Maps app offers more functionality and is easier to use.`,
  }),
  icon: APP_ICON,
});
