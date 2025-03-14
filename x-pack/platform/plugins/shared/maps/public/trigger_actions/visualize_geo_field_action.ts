/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { METRIC_TYPE } from '@kbn/analytics';
import {
  createAction,
  ACTION_VISUALIZE_GEO_FIELD,
  VisualizeFieldContext,
} from '@kbn/ui-actions-plugin/public';
import { getUsageCollection } from '../kibana_services';
import { APP_ID } from '../../common/constants';
import { getMapsLink } from './get_maps_link';

import { getVisualizeCapabilities, getCore } from '../kibana_services';

export const visualizeGeoFieldAction = createAction<VisualizeFieldContext>({
  id: ACTION_VISUALIZE_GEO_FIELD,
  type: ACTION_VISUALIZE_GEO_FIELD,
  getDisplayName: () =>
    i18n.translate('xpack.maps.discover.visualizeFieldLabel', {
      defaultMessage: 'Visualize in Maps',
    }),
  isCompatible: async (context) => {
    return Boolean(!!getVisualizeCapabilities().show && context.dataViewSpec && context.fieldName);
  },
  getHref: async (context) => {
    const { app, path } = await getMapsLink(context);

    return getCore().application.getUrlForApp(app, {
      path,
      absolute: false,
    });
  },
  execute: async (context) => {
    const { app, path, state } = await getMapsLink(context);

    const usageCollection = getUsageCollection();
    usageCollection?.reportUiCounter(
      APP_ID,
      METRIC_TYPE.CLICK,
      `create_maps_vis_${context.originatingApp ? context.originatingApp : 'unknownOriginatingApp'}`
    );

    getCore().application.navigateToApp(app, {
      path,
      state,
    });
  },
});
